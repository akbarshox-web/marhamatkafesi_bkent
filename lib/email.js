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

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Marhamat Kafesi - Tasdiqlash kodi',
    html: emailHTML,
  })

  console.log('Verification email sent to:', email)
}

async function sendResetPasswordEmail(email, code) {
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
          <p style="color: #666; margin: 10px 0 0 0;">Parolni tiklash uchun kod</p>
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

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Marhamat Kafesi - Parolni tiklash',
    html: emailHTML,
  })

  console.log('Reset password email sent to:', email)
}

async function sendOrderEmail(orderDetails) {
  console.log('[Email] Preparing order email to:', process.env.EMAIL_TO);
  
  if (!orderDetails.items || !Array.isArray(orderDetails.items)) {
    console.warn('[Email] No items in orderDetails');
    return;
  }

  const itemsList = orderDetails.items.map((item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name || 'Noma\'lum'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity || 0}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${(item.price || 0).toLocaleString("uz-UZ")} so'm</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${((item.price || 0) * (item.quantity || 0)).toLocaleString("uz-UZ")} so'm</td>
    </tr>
  `).join("")

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #80242A; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #80242A; margin: 0; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; color: #333; font-size: 16px; margin-bottom: 10px; border-left: 4px solid #80242A; padding-left: 10px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .info-label { font-weight: bold; color: #666; }
        .info-value { color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .total-row { background-color: #f9f9f9; font-weight: bold; font-size: 18px; }
        .total-row td { padding: 15px 10px; color: #80242A; }
        .location-link { color: #80242A; text-decoration: none; word-break: break-all; }
        .location-link:hover { text-decoration: underline; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MARHAMAT KAFESI</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Yangi buyurtma!</p>
        </div>
        <div class="section">
          <div class="section-title">Buyurtmachi malumotlari</div>
          <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${orderDetails.user_email || orderDetails.email || 'Noma\'lum'}</span></div>
          <div class="info-row"><span class="info-label">Telefon:</span><span class="info-value">${orderDetails.phone || 'Noma\'lum'}</span></div>
          <div class="info-row"><span class="info-label">Manzil:</span><span class="info-value">${orderDetails.address || 'Noma\'lum'}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Tovarlar</div>
          <table>
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="padding: 10px; text-align: left;">Nom</th>
                <th style="padding: 10px; text-align: center;">Soni</th>
                <th style="padding: 10px; text-align: right;">Narx</th>
                <th style="padding: 10px; text-align: right;">Jami</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">Umumiy:</td>
                <td style="text-align: right;">${(orderDetails.total_price || orderDetails.totalPrice || 0).toLocaleString("uz-UZ")} so'm</td>
              </tr>
            </tbody>
          </table>
        </div>
        ${orderDetails.latitude && orderDetails.longitude ? `<div class="section"><div class="section-title">Joylashuv</div><p><a class="location-link" href="https://www.google.com/maps?q=${orderDetails.latitude},${orderDetails.longitude}" target="_blank">https://www.google.com/maps?q=${orderDetails.latitude.toFixed(6)},${orderDetails.longitude.toFixed(6)}</a></p></div>` : ''}
        <div class="footer"><p>Buyurtma raqami: ${Date.now()}</p></div>
      </div>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: `Yangi buyurtma - ${Date.now()}`,
    html: emailHTML,
  })

  console.log('Email yuborildi:', process.env.EMAIL_TO)
}

module.exports = { sendVerificationEmail, sendResetPasswordEmail, sendOrderEmail }