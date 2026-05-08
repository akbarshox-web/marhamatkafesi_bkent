// DNS fix for MongoDB connection
const { setServers } = require("node:dns/promises")
try {
  setServers(["1.1.1.1", "8.8.8.8"])
  console.log("[DB] DNS servers set to 1.1.1.1, 8.8.8.8");
} catch (e) {
  console.error("[DB] Failed to set DNS servers:", e.message);
}

const mongoose = require('mongoose')

let isConnected = false

async function connectDB() {
  if (isConnected) return mongoose.connection

  console.log("[DB] Connecting to MongoDB...");
  try {
    // Adding event listeners for better debugging
    mongoose.connection.on('connecting', () => console.log('[DB] Mongoose connecting...'));
    mongoose.connection.on('connected', () => console.log('[DB] Mongoose connected!'));
    mongoose.connection.on('error', (err) => console.error('[DB] Mongoose error:', err.message));

    await mongoose.connect(process.env.DB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    })
    isConnected = true
    console.log('[DB] MongoDB successfully connected to host:', mongoose.connection.host)
    return mongoose.connection
  } catch (error) {
    console.error('[DB] MongoDB connection FATAL ERROR:', error.message)
    // Don't throw here, just log it so the server can at least respond with errors
    isConnected = false;
  }
}

function getConnectionStatus() {
  return isConnected
}

module.exports = { connectDB, getConnectionStatus }