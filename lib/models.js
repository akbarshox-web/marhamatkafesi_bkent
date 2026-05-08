const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, default: 'user' },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date },
  failed_login_attempts: { type: Number, default: 0 },
  ip_address: { type: String },
  country: { type: String },
  city: { type: String },
  user_agent: { type: String },
  language: { type: String },
  timezone: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  accuracy: { type: Number }
})

const orderSchema = new mongoose.Schema({
  user_email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  items: { type: Array, required: true },
  total_price: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now }
})

const User = mongoose.models.User || mongoose.model('User', userSchema)
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)

module.exports = { User, Order }