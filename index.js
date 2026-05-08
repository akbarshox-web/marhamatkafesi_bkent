require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { connectDB, getConnectionStatus } = require('./lib/db')
const { handleUsers } = require('./lib/users')
const { handleOrders } = require('./lib/orders')
const jwt = require('jsonwebtoken')

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

// Security middleware
// app.use(helmet())

// Request logger
app.use((req, res, next) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  // console.log(`[Server] Headers:`, JSON.stringify(req.headers));
  if (req.method === 'POST') {
    console.log(`[Server] Body keys:`, Object.keys(req.body || {}));
  }
  next();
});

// CORS configuration - allow specific origins for credentials
const corsOptions = {
  origin: function (origin, callback) {
    console.log(`[CORS] Request Origin: ${origin}`);
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://praktika-reakt.vercel.app',
      'https://praktika-bkent.vercel.app'
    ]

    // Allow requests with no origin (like mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Rejected Origin: ${origin}`);
      callback(new Error('CORS not allowed'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
app.use(cors(corsOptions))

const JWT_SECRET = process.env.JWT_SECRET || 'secret123'

// Rate limiter for login - commented out for debugging
// const rateLimit = require('express-rate-limit')
// const loginLimiter = rateLimit({
//   windowMs: 1 * 60 * 1000,
//   max: 5,
//   message: { error: 'Juda ko\'p so\'rovlar. 1 daqiqa kuting.' }
// })

// Middleware to check token
function authenticateToken(req, res) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return null
  }

  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

// Middleware to check admin role
function requireAdmin(req, res) {
  const user = authenticateToken(req, res)
  if (!user || user.role !== 'admin') {
    res.writeHead(403, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Admin huquqi kerak' }))
    return null
  }
  return user
}

app.all('/api/users', async (req, res) => {
  await handleUsers(req, res, req.method)
})

app.all('/api/users/:id', async (req, res) => {
  await handleUsers(req, res, req.method)
})

app.all('/api/orders', async (req, res) => {
  await handleOrders(req, res, req.method)
})

app.post('/api/send-order-email', async (req, res) => {
  const { sendOrderEmail } = require('./lib/email')
  try {
    const { orderDetails } = req.body
    await sendOrderEmail(orderDetails)
    res.status(200).json({ success: true, message: 'Order email sent' })
  } catch (err) {
    console.error('Order email error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Protected route: /api/profile
app.get('/api/profile', async (req, res) => {
  const user = authenticateToken(req, res)
  if (!user) {
    return res.status(401).json({ error: 'Kirish uchun token kerak' })
  }
  const { User } = require('./lib/models')
  try {
    const userData = await User.findById(user.id).select('-password')
    res.status(200).json(userData)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin route: /api/admin/users
app.get('/api/admin/users', async (req, res) => {
  const adminUser = requireAdmin(req, res)
  if (!adminUser) return
  const { User } = require('./lib/models')
  try {
    const users = await User.find().sort({ created_at: -1 }).select('-password')
    res.status(200).json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin route: /api/admin/orders
app.get('/api/admin/orders', async (req, res) => {
  const adminUser = requireAdmin(req, res)
  if (!adminUser) return
  const { Order } = require('./lib/models')
  try {
    const orders = await Order.find().sort({ created_at: -1 })
    res.status(200).json(orders)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin route: update order status
app.patch('/api/admin/orders/:id', async (req, res) => {
  const adminUser = requireAdmin(req, res)
  if (!adminUser) return

  const { id } = req.params
  const { status } = req.body

  const { Order } = require('./lib/models')
  try {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true })
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.status(200).json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: getConnectionStatus() ? 'connected' : 'disconnected'
  })
})

// Root route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><title>BKENT API</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;background:#f5f5f5}
      .container{max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:10px}
      h1{color:#ff6b35}a{color:#ff6b35}
    </style>
    </head><body><div class="container">
    <h1>BKENT API</h1>
    <p>Backend - Marhamat Kafesi</p>
    <ul>
      <li><a href="/api/health">/api/health</a> - Health check</li>
      <li><a href="/api/users">/api/users</a> - Foydalanuvchilar</li>
      <li><a href="/api/orders">/api/orders</a> - Buyurtmalar</li>
      <li><a href="/api/profile">/api/profile</a> - Profile (token kerak)</li>
      <li><a href="/api/admin/users">/api/admin/users</a> - Admin users</li>
      <li><a href="/api/admin/orders">/api/admin/orders</a> - Admin orders</li>
    </ul>
    </div></body></html>
  `)
})

app.listen(PORT, async () => {
  console.log(`BKENT running on http://localhost:${PORT}`)
  console.log("[Server] Attempting to connect to MongoDB...");
  try {
    await connectDB()
    console.log("[Server] Database initialization complete.");
  } catch (err) {
    console.error("[Server] Database initialization FAILED:", err.message);
  }
})

module.exports = app