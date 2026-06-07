// Test Connection Only
import express from 'express'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5001

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/ffchecker'
const MONGODB_DB = process.env.MONGODB_DB || 'ffchecker'

let mongoClient
let db


async function connectMongo() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI, { useUnifiedTopology: true })
    await mongoClient.connect()
    db = mongoClient.db(MONGODB_DB)
    console.log('✅ Connected to MongoDB')
  }
  return db
}

// Test connection endpoint
app.get('/test-connection', async (req, res) => {
  try {
    const database = await connectMongo()
    const adminDb = database.admin()
    const status = await adminDb.ping()
    
    res.json({
      success: true,
      message: 'MongoDB connection successful',
      mongodb_uri: MONGODB_URI,
      database: MONGODB_DB,
      ping: status
    })
  } catch (error) {
    console.error('Connection error:', error.message)
    res.status(500).json({
      success: false,
      message: 'MongoDB connection failed',
      error: error.message
    })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Tailwind test endpoint
app.get('/tailwind-test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Tailwind Test Page</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_25%),linear-gradient(180deg,_#0f172a_0%,_#0f172a_40%,_#0f172a_100%)] text-white">
      <div class="relative mx-auto max-w-6xl px-6 py-12">
        <div class="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl opacity-70 animate-pulse"></div>
        <div class="relative rounded-[2rem] border border-white/10 bg-slate-950/95 p-10 shadow-[0_40px_120px_-40px_rgba(14,165,233,0.45)] backdrop-blur-xl">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div class="space-y-4">
              <p class="inline-flex items-center rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300 shadow-sm shadow-cyan-500/10">
                Tailwind Live Test</p>
              <h1 class="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">Tailwind page verification</h1>
              <p class="max-w-2xl text-lg leading-8 text-slate-300">
                This page demonstrates Tailwind CSS rendering through the CDN, with animated cards, responsive layout, and interactive utility styling. Use it to verify that your Node server can serve styled HTML content without a separate CSS build step.
              </p>
            </div>
            <div class="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-cyan-500/10 backdrop-blur-xl">
              <div class="animate-bounce rounded-2xl bg-cyan-500/10 p-5 text-cyan-200 shadow-inner shadow-cyan-500/20">
                <p class="text-sm uppercase tracking-[0.24em] text-cyan-300">Animated status</p>
                <p class="mt-3 text-2xl font-semibold">Tailwind is active</p>
              </div>
            </div>
          </div>

          <div class="mt-10 grid gap-6 lg:grid-cols-3">
            <div class="group rounded-3xl border border-slate-700/80 bg-slate-950/90 p-6 transition duration-500 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-slate-900/95">
              <h2 class="text-xl font-semibold text-white">Why this page</h2>
              <p class="mt-3 text-slate-300 leading-relaxed">
                It confirms Tailwind is loaded, verifies responsive breakpoints, and shows animation utilities like <code class="rounded bg-slate-900 px-1 py-0.5">animate-pulse</code> and <code class="rounded bg-slate-900 px-1 py-0.5">animate-bounce</code>.
              </p>
            </div>
            <div class="group rounded-3xl border border-slate-700/80 bg-slate-950/90 p-6 transition duration-500 hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-slate-900/95">
              <h2 class="text-xl font-semibold text-white">What to verify</h2>
              <ul class="mt-3 space-y-3 text-slate-300">
                <li>✅ Gradient background and blurred highlight</li>
                <li>✅ Animated pulse and bounce elements</li>
                <li>✅ Responsive layout on mobile and desktop</li>
                <li>✅ Tailwind CDN utilities rendering correctly</li>
              </ul>
            </div>
            <div class="group rounded-3xl border border-slate-700/80 bg-slate-950/90 p-6 transition duration-500 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-slate-900/95">
              <h2 class="text-xl font-semibold text-white">How to use it</h2>
              <p class="mt-3 text-slate-300 leading-relaxed">
                Open <code class="rounded bg-slate-900 px-1 py-0.5">/tailwind-test</code> and confirm the page loads with animated cards, a highlighted CTA, and a clean responsive design. Refreshing is not required to verify the styling layer.
              </p>
            </div>
          </div>

          <div class="mt-10 rounded-[2rem] border border-cyan-500/10 bg-cyan-500/5 p-6 shadow-[0_30px_60px_-30px_rgba(56,189,248,0.7)]">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm uppercase tracking-[0.18em] text-cyan-200">Live deploy check</p>
                <h2 class="mt-2 text-2xl font-semibold text-white">Autodeploy watch support</h2>
                <p class="mt-3 max-w-2xl text-slate-100 leading-7">
                  If your app is configured for auto-deploy or hot reload, this page is a visual checkpoint: whenever you push code, the browser should show the latest Tailwind rendering after the deployment completes.
                </p>
              </div>
              <a href="/" class="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-cyan-400">
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `)
})

// Hello Beautiful endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hello World Beautiful fern ssmys deadddsssdsr</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
          text-align: center;
          color: white;
        }
        h1 {
          font-size: 4rem;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          animation: fadeIn 1s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .emoji {
          font-size: 3rem;
          margin-bottom: 20px;
        }
        .subtext {
          margin-top: 16px;
          font-size: 1rem;
          color: rgba(255,255,255,0.85);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">✨</div>
        <h1>LOVE FERN sud susd</h1>
        <p class="subtext">Try the Tailwind test page at <strong>/tailwind-test</strong> to verify Tailwind CSS styling.</p>
      </div>
    </body>
    </html>
  `)
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`)
  console.log(`📝 Test connection at http://localhost:${PORT}/test-connection`)
  console.log(`💚 Health check at http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  if (mongoClient) {
    await mongoClient.close()
    console.log('MongoDB connection closed')
  }
  process.exit(0)
})
