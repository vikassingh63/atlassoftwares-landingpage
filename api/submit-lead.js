const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');

const uri = process.env.MONGODB_URI;
const dbName = 'atlas_softwares_db';

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  if (!uri) throw new Error('MONGODB_URI environment variable missing');
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  // CORS Headers Setup
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { name, email, phone, message, pageSource } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Required fields missing' });
  }

  try {
    // ---- STEP 1: MONGODB SAVE ----
    try {
      const client = await connectToDatabase();
      const db = client.db(dbName);
      const collection = db.collection('leads');

      await collection.insertOne({
        name,
        email,
        phone,
        message: message || '',
        pageSource: pageSource || 'Website Main Form',
        createdAt: new Date()
      });
    } catch (dbErr) {
      console.error('MongoDB Error:', dbErr);
    }

    // ---- STEP 2: NAMECHEAP MAIL TRIGGER ----
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'mail.privateemail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // Port 587 ke sath false hi sahi hai
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Atlas Softwares Leads" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `🔥 New Lead Received from ${pageSource || 'Website'}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background-color: #fafafa; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #111; margin: 0; font-size: 24px; font-weight: 700;">Atlas Softwares</h2>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Inbound Lead Engine Notification</p>
          </div>
          
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #111;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong style="color: #111;">Source Page:</strong> ${pageSource || 'Not Specified'}</p>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong style="color: #111;">Client Name:</strong> ${name}</p>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong style="color: #111;">Email Address:</strong> ${email}</p>
            <p style="margin: 0 0 15px 0; font-size: 14px; color: #555;"><strong style="color: #111;">Phone Number:</strong> ${phone}</p>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
              <strong style="display: block; margin-bottom: 8px; color: #111; font-size: 14px;">Message:</strong>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; color: #333; font-size: 14px; line-height: 1.5;">${message || 'No message provided.'}</div>
            </div>
          </div>
        </div>
      `
    };

    // Mail Send
    await transporter.sendMail(mailOptions);

    // ---- STEP 3: MAKE.COM WEBHOOK TRIGGER (Fail-Safe Wrapper) ----
    if (process.env.MAKE_WEBHOOK_URL) {
      try {
        await fetch(process.env.MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone,
            message: message || 'No message provided.',
            pageSource: pageSource || 'Website Main Form',
            submittedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
          })
        });
      } catch (webhookErr) {
        console.error('Webhook execution bypassed:', webhookErr);
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Lead processed successfully!' 
    });

  } catch (error) {
    console.error('Backend Processing Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
}