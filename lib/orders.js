const { Order } = require('../lib/models')
const { connectDB } = require('../lib/db')
const { sendOrderEmail } = require('../lib/email')

async function handleOrders(req, res, method) {
  await connectDB()

  if (method === 'GET') {
    const orders = await Order.find().sort({ created_at: -1 })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(orders))
    return
  }

  if (method === 'POST') {
    console.log('[Orders] New order request received');
    try {
      const data = req.body 
      const newOrder = new Order({
        user_email: data.user_email,
        phone: data.phone,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        items: data.items,
        total_price: data.total_price,
        status: 'pending',
        created_at: new Date()
      })
      
      console.log('[Orders] Saving order to database...');
      await newOrder.save()
      console.log('[Orders] Order saved successfully');

      // Send email with a 7-second timeout to prevent hanging the response
      console.log('[Orders] Initiating email notification...');
      try {
        const emailPromise = sendOrderEmail(data);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email timeout')), 7000)
        );
        
        // We don't necessarily need to await this if we want to respond faster,
        // but race ensures we don't wait forever.
        await Promise.race([emailPromise, timeoutPromise]);
        console.log('[Orders] Email notification process completed');
      } catch (emailError) {
        console.error('[Orders] Email notification failed or timed out:', emailError.message);
      }

      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(newOrder))
    } catch (e) {
      console.error('[Orders] FATAL error in POST:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}

module.exports = { handleOrders }
