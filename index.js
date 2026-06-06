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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">✨</div>
        <h1>Hello World Beautiful!</h1>
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
