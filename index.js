// Set Puppeteer to use system Chromium

// server.js
import express from 'express'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import dayjs from 'dayjs'

puppeteer.use(StealthPlugin())
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

const app = express()
const PORT = process.env.PORT || 5001

const FF_TZ = 'Asia/Bangkok' // you can change
const DAYS_AHEAD = 3
const BASE_URL = 'https://www.forexfactory.com/calendar'
process.env.TZ = 'Asia/Bangkok'

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://admin:AaBb1234!@188.166.213.216/qdragon'
const MONGODB_DB = process.env.MONGODB_DB || 'qdragon'
let mongoClient
let db

async function connectMongo() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI, { useUnifiedTopology: true })
    await mongoClient.connect()
    db = mongoClient.db(MONGODB_DB)
    console.log('Connected to MongoDB')
  }
  return db
}
// Interval fetch and store
async function fetchAndStore() {
  let browser = null
  try {
    const tzNow = dayjs().tz(FF_TZ)
    let all = []
    // Launch browser once
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--lang=en-US,en'
    ]

    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      executablePath: process.env.CHROME_PATH || undefined,
      args: args
    })

    // Scrape the main calendar page
    const scrapedEvents = await fetchCalendar(browser)

    // Filter for DAYS_AHEAD days
    const targetDates = []
    // Include yesterday just in case of timezone differences
    targetDates.push(tzNow.subtract(1, 'day').format('YYYY-MM-DD'))
    for (let i = 0; i < DAYS_AHEAD; i++) {
      targetDates.push(tzNow.add(i, 'day').format('YYYY-MM-DD'))
    }
    all = scrapedEvents.filter((e) => targetDates.includes(e.date))

    // Summary of data before storing
    const summary = {
      totalEvents: all.length,
      dateRange: targetDates,
      breakdown: {}
    }

    all.forEach((e) => {
      if (!summary.breakdown[e.date]) {
        summary.breakdown[e.date] = { total: 0, impacts: {} }
      }
      summary.breakdown[e.date].total++
      summary.breakdown[e.date].impacts[e.impact] =
        (summary.breakdown[e.date].impacts[e.impact] || 0) + 1
    })

    console.log('--- Pre-DB Storage Summary ---')
    console.log(JSON.stringify(summary, null, 2))
    console.log('------------------------------')

    if (!db) await connectMongo()
    if (db) {
      const col = db.collection('ff_events')
      const now = new Date()
      let upserted = 0
      for (const e of all) {
        // Use unique ID from ForexFactory to identify the event
        const filter = { id: e.id }

        // Find any existing event
        const oldEvent = await col.findOne(filter)
        if (oldEvent) {
          // Update existing event
          const update = { $set: { ...e, fetched_at: now } }
          await col.updateOne(filter, update)
          if (
            oldEvent.title !== e.title ||
            oldEvent.time !== e.time ||
            oldEvent.impact !== e.impact
          ) {
            // Log change if needed
          }
        } else {
          // Insert new event
          // Check if we have a legacy event (no id) with same title/date to avoid duplicates
          // This is a one-time migration helper
          const legacyFilter = {
            date: e.date,
            currency: e.currency,
            title: e.title
          }
          await col.deleteMany(legacyFilter)

          const update = { $set: { ...e, fetched_at: now } }
          await col.updateOne(filter, update, { upsert: true })
          upserted++
        }
      }
      console.log(`Upserted ${upserted} events to MongoDB`)
      // Cleanup past events
      const today = dayjs().tz(FF_TZ).format('YYYY-MM-DD')
      const currentHour = dayjs().tz(FF_TZ).hour()
      const currentMin = dayjs().tz(FF_TZ).minute()
      const currentTotalMin = currentHour * 60 + currentMin
      const allDocs = await col.find({}).toArray()
      const toDelete = []
      for (const e of allDocs) {
        if (e.date < today) {
          toDelete.push({ _id: e._id })
        } else if (e.date === today) {
          let eventHour = null
          let eventMin = null
          try {
            const timeMatch = e.time.match(/(\d+):(\d+)(am|pm)/i)
            if (timeMatch) {
              let hour = parseInt(timeMatch[1])
              const min = parseInt(timeMatch[2])
              const ampm = timeMatch[3].toLowerCase()
              if (ampm === 'pm' && hour !== 12) hour += 12
              if (ampm === 'am' && hour === 12) hour = 0
              eventHour = hour
              eventMin = min
            }
          } catch (err) {}
          if (eventHour !== null && eventMin !== null) {
            const eventTotalMin = eventHour * 60 + eventMin
            if (eventTotalMin + 30 <= currentTotalMin) {
              toDelete.push({ _id: e._id })
            }
          }
        }
        // For future dates, don't clean
      }
      if (toDelete.length > 0) {
        await col.deleteMany({ $or: toDelete })
        console.log(`Cleaned up ${toDelete.length} past events`)
      }
    }
  } catch (err) {
    console.error('fetchAndStore error:', err)
  } finally {
    if (browser) await browser.close()
  }
}

// Run every 45 minutes
setInterval(fetchAndStore, 45 * 60 * 1000)
// Run once at startup
fetchAndStore()

async function fetchCalendar(browser) {
  let page = null
  try {
    page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setDefaultTimeout(60000)

    // Go to main page first to pass Cloudflare
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 })

    // Prepare payload
    const beginDate = dayjs().tz(FF_TZ).format('MMMM D, YYYY')
    const endDate = dayjs()
      .tz(FF_TZ)
      .add(DAYS_AHEAD, 'day')
      .format('MMMM D, YYYY')

    const payload = {
      begin_date: beginDate,
      end_date: endDate,
      default_view: 'this_week',
      impacts: [3, 2, 1],
      event_types: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11],
      currencies: [9] // USD
    }

    console.log('Fetching calendar with payload:', JSON.stringify(payload))

    // Execute fetch in browser
    const responseData = await page.evaluate(async (payload) => {
      const res = await fetch(
        'https://www.forexfactory.com/calendar/apply-settings/1?navigation=0',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(payload)
        }
      )
      if (!res.ok) throw new Error('Fetch failed: ' + res.status)
      return res.json()
    }, payload)

    if (!responseData || !responseData.days) {
      console.log('No days data in response from apply-settings')
      return []
    }

    // Parse JSON data directly
    const rawEvents = []
    if (Array.isArray(responseData.days)) {
      responseData.days.forEach((day) => {
        if (day.events && Array.isArray(day.events)) {
          day.events.forEach((e) => {
            // Map fields
            let impact = null
            const impactTitle = e.impactTitle || ''
            if (impactTitle.includes('High Impact Expected')) impact = 'High'
            else if (impactTitle.includes('Medium Impact Expected'))
              impact = 'Medium'
            else if (impactTitle.includes('Low Impact Expected')) impact = 'Low'
            else if (impactTitle.includes('Non-Economic'))
              impact = 'Non-Economic'

            if (!impact) return
            if (e.currency !== 'USD') return

            // Use dateline for accurate date/time
            const dt = dayjs.unix(e.dateline).tz(FF_TZ)
            const date = dt.format('YYYY-MM-DD')
            let time = dt.format('h:mmA').toLowerCase()

            // Check if timeLabel indicates it's not a specific time
            if (e.timeLabel && !e.timeLabel.match(/\d+:\d+/)) {
              time = e.timeLabel
            }
            const event = {
              id: e.id,
              date,
              time,
              impact,
              title: e.name,
              currency: e.currency
            }
            rawEvents.push(event)
          })
        }
      })
    }

    console.log(`Scraped ${rawEvents.length} events via API`)

    return rawEvents.filter(
      (e) =>
        e.time && (e.time.match(/\d/) || e.time.toLowerCase() === 'tentative')
    )
  } catch (error) {
    console.error('Error scraping calendar', error)
    return []
  } finally {
    if (page) await page.close()
  }
}

let checkNewsCache = null
let cacheExpiry = 0

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/news', async (req, res) => {
  const now = Date.now()
  if (checkNewsCache && now < cacheExpiry) {
    return res.json({ ...checkNewsCache, cached: true })
  }

  console.log('Received request for /news')
  try {
    if (!db) await connectMongo()
    const today = dayjs().tz(FF_TZ).format('YYYY-MM-DD')
    const col = db.collection('ff_events')
    // Find only today's USD events
    const docs = await col.find({ date: today, currency: 'USD' }).toArray()
    const currentHour = dayjs().tz(FF_TZ).hour()
    const currentMin = dayjs().tz(FF_TZ).minute()
    const currentTotalMin = currentHour * 60 + currentMin
    let upcomingEvents = []
    let nextEvent = null
    for (const e of docs) {
      let eventHour = null
      let eventMin = null
      try {
        const timeMatch = e.time.match(/(\d+):(\d+)(am|pm)/i)
        if (timeMatch) {
          let hour = parseInt(timeMatch[1])
          const min = parseInt(timeMatch[2])
          const ampm = timeMatch[3].toLowerCase()
          if (ampm === 'pm' && hour !== 12) hour += 12
          if (ampm === 'am' && hour === 12) hour = 0
          eventHour = hour
          eventMin = min
        }
      } catch (err) {}
      if (eventHour !== null && eventMin !== null) {
        const eventTotalMin = eventHour * 60 + eventMin
        const diffMin = Math.abs(eventTotalMin - currentTotalMin)
        if (diffMin <= 30) {
          upcomingEvents.push({ ...e, eventHour, eventMin })
        } else if (
          eventTotalMin > currentTotalMin &&
          (!nextEvent ||
            eventTotalMin < nextEvent.eventHour * 60 + nextEvent.eventMin)
        ) {
          nextEvent = { ...e, eventHour, eventMin }
        }
      }
    }
    let upcomingEvent = null
    if (upcomingEvents.length > 0) {
      // Find the one with max eventTotalMin
      upcomingEvent = upcomingEvents.reduce((max, e) =>
        e.eventHour * 60 + e.eventMin > max.eventHour * 60 + max.eventMin
          ? e
          : max
      )
      // Adjust stoptime to max + 30 min
      const maxTotalMin = upcomingEvents.reduce(
        (max, e) => Math.max(max, e.eventHour * 60 + e.eventMin),
        0
      )
      upcomingEvent.stoptime = maxTotalMin + 60
    }
    const response = {
      status: upcomingEvent ? 'stop' : 'normal',
      ...(upcomingEvent && {
        event: { ...upcomingEvent, eventHour: undefined, eventMin: undefined }
      }),
      ...(nextEvent && {
        next_event: {
          ...nextEvent,
          eventHour: undefined,
          eventMin: undefined
        }
      }),
      cached: false
    }
    // Cache for 60 seconds
    checkNewsCache = response
    cacheExpiry = now + 60 * 1000
    res.json(response)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed to check news' })
  }
})

// Beautiful HTML page to view all events
app.get('/now', async (req, res) => {
  try {
    if (!db) await connectMongo()
    const col = db.collection('ff_events')
    const docs = await col.find({}).sort({ date: 1, time: 1 }).toArray()

    const now = dayjs().tz(FF_TZ)
    const currentDate = now.format('YYYY-MM-DD')
    const currentTime = now.format('h:mm A')

    // Group events by date
    const eventsByDate = {}
    docs.forEach((e) => {
      if (!eventsByDate[e.date]) eventsByDate[e.date] = []
      eventsByDate[e.date].push(e)
    })

    const impactColors = {
      High: { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' },
      Medium: { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' },
      Low: { bg: '#dbeafe', border: '#3b82f6', text: '#2563eb' },
      'Non-Economic': { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280' }
    }

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ForexFactory News Checker</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      padding: 20px;
      color: #e2e8f0;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 30px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      backdrop-filter: blur(10px);
    }
    .header h1 {
      font-size: 2.5rem;
      background: linear-gradient(90deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    .header .time {
      color: #94a3b8;
      font-size: 1.1rem;
    }
    .date-section {
      margin-bottom: 25px;
    }
    .date-header {
      font-size: 1.3rem;
      font-weight: 600;
      padding: 12px 20px;
      background: rgba(255,255,255,0.1);
      border-radius: 12px 12px 0 0;
      border-left: 4px solid #60a5fa;
    }
    .date-header.today {
      background: rgba(96, 165, 250, 0.2);
      border-left-color: #22c55e;
    }
    .events-list {
      background: rgba(255,255,255,0.03);
      border-radius: 0 0 12px 12px;
      overflow: hidden;
    }
    .event {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.2s;
    }
    .event:hover { background: rgba(255,255,255,0.05); }
    .event:last-child { border-bottom: none; }
    .event-time {
      min-width: 90px;
      font-weight: 600;
      color: #94a3b8;
      font-size: 0.95rem;
    }
    .event-impact {
      min-width: 100px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-align: center;
      margin-right: 15px;
    }
    .event-title {
      flex: 1;
      font-weight: 500;
    }
    .event-currency {
      background: rgba(96, 165, 250, 0.2);
      color: #60a5fa;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .no-events {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }
    .legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .refresh-btn {
      display: block;
      margin: 20px auto;
      padding: 12px 30px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .refresh-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ForexFactory News</h1>
      <p class="time">Current Time (${FF_TZ}): ${currentDate} ${currentTime}</p>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background: #ef4444;"></div> High Impact</div>
        <div class="legend-item"><div class="legend-dot" style="background: #f59e0b;"></div> Medium Impact</div>
        <div class="legend-item"><div class="legend-dot" style="background: #3b82f6;"></div> Low Impact</div>
        <div class="legend-item"><div class="legend-dot" style="background: #9ca3af;"></div> Non-Economic</div>
      </div>
    </div>
`

    const sortedDates = Object.keys(eventsByDate).sort()

    if (sortedDates.length === 0) {
      html += '<div class="no-events">No events found in database</div>'
    } else {
      for (const date of sortedDates) {
        const isToday = date === currentDate
        const dateObj = dayjs(date)
        const formattedDate = dateObj.format('dddd, MMMM D, YYYY')

        html += `
    <div class="date-section">
      <div class="date-header ${isToday ? 'today' : ''}">${
          isToday ? '📍 TODAY - ' : ''
        }${formattedDate}</div>
      <div class="events-list">
`
        for (const event of eventsByDate[date]) {
          const colors =
            impactColors[event.impact] || impactColors['Non-Economic']
          html += `
        <div class="event">
          <div class="event-time">${event.time}</div>
          <div class="event-impact" style="background: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border};">${event.impact}</div>
          <div class="event-title">${event.title}</div>
          <div class="event-currency">${event.currency}</div>
        </div>
`
        }
        html += `
      </div>
    </div>
`
      }
    }

    html += `
    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
  </div>
</body>
</html>
`
    res.send(html)
  } catch (e) {
    console.error(e)
    res.status(500).send('Error loading events')
  }
})

app.listen(PORT, () => {
  console.log(`FF API running on http://localhost:${PORT}`)
})
