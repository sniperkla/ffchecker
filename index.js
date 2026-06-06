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
