const { User } = require('../lib/models')
const { connectDB } = require('../lib/db')
const { sendVerificationEmail, sendResetPasswordEmail } = require('../lib/email')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const JWT_SECRET = process.env.JWT_SECRET || 'secret123'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshsecret123'

async function handleUsers(req, res, method) {
  console.log(`[Users] ${method} request started: ${req.url}`);
  
  try {
    await connectDB();
    console.log("[Users] DB connected");
  } catch (dbErr) {
    console.error("[Users] DB connection error:", dbErr.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Ma'lumotlar bazasiga ulanishda xatolik" }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname

  const userIdMatch = path.match(/^\/api\/users\/([a-f0-9]+)$/i)
  if (userIdMatch && method === 'PATCH') {
    const userId = userIdMatch[1]
    console.log(`[Users] Patching user: ${userId}`);
    try {
      const data = req.body 

      const updateData = {}
      const allowedFields = [
        'last_login', 'failed_login_attempts', 'ip_address', 'country', 'city',
        'user_agent', 'latitude', 'longitude', 'accuracy'
      ]
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field]
        }
      }
      const user = await User.findByIdAndUpdate(userId, updateData, { new: true })
      if (!user) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'User not found' }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(user))
    } catch (e) {
      console.error("[Users] PATCH error:", e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  if (method === 'GET') {
    console.log("[Users] Fetching all users");
    try {
      const users = await User.find().sort({ created_at: -1 })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(users))
    } catch (e) {
      console.error("[Users] GET error:", e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  if (method === 'POST') {
    try {
      const data = req.body 
      if (!data || Object.keys(data).length === 0) {
        console.warn("[Users] POST request with no data");
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Ma'lumotlar kelmadi" }));
        return;
      }

      const action = data.action;
      console.log(`[Users] Action: ${action}`);

      // REGISTER
      if (action === 'register') {
        const email = data.email.toLowerCase().trim()
        console.log(`[Users] Registering: ${email}`);
        
        const existingUser = await User.findOne({ email })
        if (existingUser) {
          console.log(`[Users] User already exists: ${email}`);
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan' }))
          return
        }
        
        const hashedPassword = await bcrypt.hash(data.password, 10)
        const code = Math.floor(100000 + Math.random() * 900000).toString()

        const newUser = new User({
          email: email,
          password: hashedPassword,
          phone: data.phone,
          verificationCode: code,
          ip_address: data.ip_address,
          country: data.country,
          city: data.city,
          user_agent: data.user_agent,
          language: data.language,
          timezone: data.timezone,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          failed_login_attempts: data.failed_login_attempts || 0,
          last_login: data.last_login || new Date(),
          created_at: data.created_at || new Date()
        })
        
        console.log("[Users] Saving new user...");
        await newUser.save()
        console.log("[Users] User saved");

        // Send verification email with 8 second timeout
        console.log("[Users] Sending email...");
        let emailSent = false
        let emailError = null
        
        try {
          const emailPromise = sendVerificationEmail(email, code);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Email timeout")), 8000)
          );
          
          await Promise.race([emailPromise, timeoutPromise]);
          emailSent = true;
          console.log("[Users] Email sent successfully");
        } catch (err) {
          emailError = err.message
          console.error('[Users] Email error or timeout:', err.message)
        }

        res.writeHead(201, { 'Content-Type': 'application/json' })
        if (emailSent) {
          res.end(JSON.stringify({ message: 'Emailingizga tasdiqlash kodi yuborildi.', step: 'verify' }))
        } else {
          console.log(`[Users] Returning code in response for testing: ${code}`);
          res.end(JSON.stringify({
            message: 'Tizimda email yuborishda muammo bo\'ldi, lekin ro\'yxatdan o\'tdingiz. Tasdiqlash kodi: ' + code,
            code: code,
            step: 'verify'
          }))
        }
        return
      }

      // VERIFY EMAIL
      if (action === 'verify') {
        const email = data.email.toLowerCase().trim()
        console.log(`[Users] Verifying: ${email} with code: ${data.code}`);
        const user = await User.findOne({ email, verificationCode: data.code })
        if (!user) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Kod xato yoki muddati tugagan' }))
          return
        }
        user.isVerified = true
        user.verificationCode = undefined
        await user.save()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'Email muvaffaqiyatli tasdiqlandi!' }))
        return
      }

      // LOGIN
      if (action === 'login') {
        const email = data.email.toLowerCase().trim()
        console.log(`[Users] Login attempt: ${email}`);
        const user = await User.findOne({ email })
        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Email yoki parol xato' }))
          return
        }

        const isMatch = await bcrypt.compare(data.password, user.password)
        if (!isMatch) {
          user.failed_login_attempts += 1
          await user.save()
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Email yoki parol xato' }))
          return
        }

        user.failed_login_attempts = 0
        user.last_login = new Date()
        await user.save()

        const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '15m' })
        const refreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: '7d' })

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
        })
        res.end(JSON.stringify({ accessToken, refreshToken, id: user._id, role: user.role, email: user.email }))
        return
      }

      // REFRESH TOKEN
      if (action === 'refresh') {
        const refreshToken = data.refreshToken || req.headers.cookie?.match(/refreshToken=([^;]+)/)?.[1]
        if (!refreshToken) {
          res.writeHead(403, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Refresh token topilmadi' }))
          return
        }
        jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
          if (err) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Yaroqsiz token' }))
            return
          }
          const user = await User.findById(decoded.id)
          if (!user) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Foydalanuvchi topilmadi' }))
            return
          }
          const newAccess = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '15m' })
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ accessToken: newAccess }))
        })
        return
      }

      // FORGOT PASSWORD
      if (action === 'forgot') {
        const email = data.email.toLowerCase().trim()
        const user = await User.findOne({ email })
        if (!user) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ message: 'Agar bu email ro\'yxatdan o\'tgan bo\'lsa, kod yuboriladi.' }))
          return
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        user.verificationCode = code
        await user.save()

        try {
          await sendResetPasswordEmail(email, code)
        } catch (emailError) {
          console.error('[Users] Forgot-time email error:', emailError.message)
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'Parolni tiklash kodi emailingizga yuborildi.' }))
        return
      }

      // RESET PASSWORD
      if (action === 'reset') {
        const email = data.email.toLowerCase().trim()
        const user = await User.findOne({ email, verificationCode: data.code })
        if (!user) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Kod xato yoki muddati tugagan' }))
          return
        }
        const hashedPassword = await bcrypt.hash(data.newPassword, 10)
        user.password = hashedPassword
        user.verificationCode = undefined
        await user.save()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'Parol muvaffaqiyatli o\'zgartirildi!' }))
        return
      }

      // If no action matched
      console.warn(`[Users] Unhandled action: ${action}`);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Noma'lum harakat: ${action}` }));

    } catch (e) {
      console.error("[Users] POST error catch:", e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  console.warn(`[Users] Unhandled method: ${method}`);
  res.writeHead(405, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}

module.exports = { handleUsers }