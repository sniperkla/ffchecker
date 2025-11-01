// Set Puppeteer to use system Chromium
function buildFFUrl(d) {
  const month = d.format('MMM').toLowerCase()
  const day = d.format('D')
  const year = d.format('YYYY')
  return `${BASE_URL}?day=${month}${day}.${year}`
}
// server.js
import express from 'express'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()
import puppeteer from 'puppeteer'
import dayjs from 'dayjs'
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
  try {
    const tzNow = dayjs().tz(FF_TZ)
    let all = []
    for (let i = 0; i <= DAYS_AHEAD; i++) {
      const d = tzNow.add(i, 'day')
      const ev = await fetchOneDay(d)
      all = all.concat(ev)
    }
    if (!db) await connectMongo()
    if (db) {
      const col = db.collection('ff_events')
      const now = new Date()
      let upserted = 0
      for (const e of all) {
        const filter = { date: e.date, title: e.title }
        const update = { $set: { ...e, fetched_at: now } }
        const result = await col.updateOne(filter, update, { upsert: true })
        if (result.upsertedCount > 0 || result.modifiedCount > 0) upserted++
      }
      console.log(`Upserted ${upserted} events to MongoDB`)
      // Cleanup past events
      const currentHour = dayjs().tz(FF_TZ).hour()
      const currentMin = dayjs().tz(FF_TZ).minute()
      const currentTotalMin = currentHour * 60 + currentMin
      const allDocs = await col.find({}).toArray()
      const toDelete = []
      for (const e of allDocs) {
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
      if (toDelete.length > 0) {
        await col.deleteMany({ $or: toDelete })
        console.log(`Cleaned up ${toDelete.length} past events`)
      }
    }
  } catch (err) {
    console.error('fetchAndStore error:', err)
  }
}

// Run every 3 minutes
setInterval(fetchAndStore, 9 * 60 * 1000)
// Run once at startup
fetchAndStore()

async function fetchOneDay(d) {
  const url = buildFFUrl(d)
  // const browser = await puppeteer.launch({ headless: true })
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--lang=en-US,en',
      '--force-timezone=Asia/Bangkok'
    ],
    env: {
      TZ: 'Asia/Bangkok'
    }
  })
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0 Safari/537.36'
  )
  await page.goto(url, { waitUntil: 'networkidle2' })
  // Try to select table rows with event data
  const events = await page.evaluate((dateStr) => {
    const rows = Array.from(document.querySelectorAll('tr'))
    const events = []
    rows.forEach((row) => {
      if (row.classList.contains('calendar__row--grey')) return
      const impactCell = row.querySelector('td.calendar__impact .icon')
      if (!impactCell) return
      let impact = null
      const impactTitle = impactCell.getAttribute('title') || ''
      if (impactTitle.includes('High Impact Expected')) impact = 'High'
      else if (impactTitle.includes('Med Impact Expected')) impact = 'Medium'
      else if (impactTitle.includes('Low Impact Expected')) impact = 'Low'
      if (!impact) return
      const tds = row.querySelectorAll('td')
      let time = ''
      if (tds.length > 0) {
        time = tds[0].innerText.trim()
      }
      let currency = ''
      if (tds.length > 2) {
        currency = tds[2].innerText.trim()
      }
      let title = ''
      const eventTitle = row.querySelector('.calendar__event-title')
      if (eventTitle) {
        title = eventTitle.innerText.trim()
      }
      if (currency !== 'USD') return
      const event = { date: dateStr, time, impact, title, currency }
      events.push(event)
    })
    return events
  }, d.format('YYYY-MM-DD'))
  await browser.close()
  console.log('events', events)

  return events.filter(
    (e) =>
      e.time && (e.time.match(/\d/) || e.time.toLowerCase() === 'tentative')
  )

  // end fetchOneDay
}

let checkNewsCache = null
let cacheExpiry = 0

app.get('/checknews', async (req, res) => {
  const now = Date.now()
  if (checkNewsCache && now < cacheExpiry) {
    return res.json({ ...checkNewsCache, cached: true })
  }

  console.log('Received request for /checknews')
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

app.listen(PORT, () => {
  console.log(`FF API running on http://localhost:${PORT}`)
})
