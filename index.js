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
    <body class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-700 to-cyan-500 text-white">
      <div class="mx-auto max-w-5xl px-6 py-12">
        <div class="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <h1 class="text-4xl font-bold mb-4">Tailwind Test Page</h1>
          <p class="mb-6 text-lg leading-relaxed text-slate-200">
            This page is designed to verify Tailwind CSS styling using the CDN and to provide a simple test layout.
            Open this endpoint while the server is running to confirm that the Tailwind utilities are loaded correctly.
          </p>
          <div class="grid gap-6 lg:grid-cols-2">
            <div class="rounded-2xl border border-slate-200/10 bg-slate-950/80 p-6">
              <h2 class="text-2xl font-semibold mb-3">Test details</h2>
              <ul class="list-disc list-inside space-y-2 text-slate-300">
                <li>Tailwind CDN loaded from <code class="rounded bg-slate-900 px-1 py-0.5">https://cdn.tailwindcss.com</code></li>
                <li>Responsive layout and utility classes</li>
                <li>Typography, spacing, and card styles shown</li>
                <li>Use this page for quick visual verification</li>
              </ul>
            </div>
            <div class="rounded-2xl border border-slate-200/10 bg-slate-950/80 p-6">
              <h2 class="text-2xl font-semibold mb-3">How to use</h2>
              <p class="text-slate-300 leading-relaxed">
                Visit <code class="rounded bg-slate-900 px-1 py-0.5">/tailwind-test</code> from your browser and check that the page renders with styled sections, buttons, and background gradients.
              </p>
              <p class="mt-4 text-slate-200"><strong>Endpoint:</strong> <code class="rounded bg-slate-900 px-1 py-0.5">/tailwind-test</code></p>
            </div>
          </div>
          <div class="mt-8">
            <a href="/" class="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
              ← Back to Home
            </a>
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
      <title>Hello World Beautiful</title>
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
        <h1>Hello World Beautiful!</h1>
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
