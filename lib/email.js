const nodemailer = require('nodemailer')
require('dotenv').config() // .env faylidan o'zgaruvchilarni yuklash

const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true, // Use pooled connections
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

console.log("Email tizimi diagnostikasi:", { user: process.env.EMAIL_USER, pass_configured: !!process.env.EMAIL_PASS });

// Transporterni tekshirish
transporter.verify(function (error, success) {
  if (error) {
    console.error("Email server ulanishida xatolik (VERIFY):", {
      message: error.message,
      code: error.code,
      command: error.command
    });
  } else {
    console.log("Email server tayyor (Gmail service)!");
  }
});

async function sendVerificationEmail(email, code) {
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 500px; margin: 20px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #80242A; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #80242A; margin: 0; }
        .code-box { background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #80242A; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MARHAMAT KAFESI</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Ro'yxatdan o'tish uchun tasdiqlash kodi</p>
        </div>
        <div class="code-box">${code}</div>
        <p style="color: #666; text-align: center;">Bu kod 10 daqiqa davomida amal qiladi.</p>
        <div class="footer">
          <p>Bu xatni siz so'ramagan bo'lsangiz, e'tibor bermang.</p>
        </div>
      </div>
    </body>
    </html>
  `

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email sozlamalari (.env) topilmadi!")
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Marhamat Kafesi - Tasdiqlash kodi',
      html: emailHTML,
    })
    console.log('Verification email sent successfully:', info.response)
  } catch (error) {
    console.error('Verification email delivery failed:', error)
    throw error
  }
}

async function sendResetPasswordEmail(email, code) {
  // ... existing HTML ...
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Marhamat Kafesi - Parolni tiklash',
      html: emailHTML,
    })
    console.log('Reset password email sent successfully:', info.response)
  } catch (error) {
    console.error('Reset password email delivery failed:', error)
    throw error
  }
}

async function sendOrderEmail(orderDetails) {
  // ... existing code ...
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `Yangi buyurtma - ${Date.now()}`,
      html: emailHTML,
    })
    console.log('Order email sent successfully:', info.response)
  } catch (error) {
    console.error('Order email delivery failed:', error)
    throw error
  }
}

module.exports = { sendVerificationEmail, sendResetPasswordEmail, sendOrderEmail }