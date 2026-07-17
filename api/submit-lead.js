const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');

// MongoDB URI aur Database Name configuration
const uri = process.env.MONGODB_URI; // Vercel env se automatic pick karega
const dbName = 'atlas_softwares_db'; 

let cachedClient = null;

// Database Connection Helper (Serverless optimization ke liye)
async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  }
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

  // Handle OPTIONS request (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Sirf POST request allow karenge data submission ke liye
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { name, email, phone, message, pageSource } = req.body;

  // Validation: Basic checking
  if (!name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Required fields are missing' });
  }

  try {
    // ---- STEP 1: MONGODB ME DATA SAVE KARNA ----
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection('leads');

    const leadData = {
      name,
      email,
      phone,
      message: message || '',
      pageSource: pageSource || 'Website Main Form',
      createdAt: new Date()
    };

    // Database me insert query run karein
    await collection.insertOne(leadData);


    // ---- STEP 2: NAMECHEAP PROFESSIONAL MAIL TRIGGER ----
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,        // mail.privateemail.com
      port: parseInt(process.env.EMAIL_PORT) || 587, 
      secure: false,                        
      requireTLS: true,                     
      auth: {
        user: process.env.EMAIL_USER,      // sales@atlassoftwares.com
        pass: process.env.EMAIL_PASS       
      },
      tls: {
        rejectUnauthorized: false          
      }
    });

    // Custom HTML Email template design
    const mailOptions = {
      from: `"Atlas Softwares Leads" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,        
      replyTo: email,                   
      subject: `🔥 New Lead Received from ${pageSource || 'Website'}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background-color: #fafafa; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #111; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Atlas Softwares</h2>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Inbound Lead Engine Notification</p>
          </div>
          
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border-left: 4px solid #111;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong style="color: #111;">Source Page:</strong> ${pageSource || 'Not Specified'}</p>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong style="color: #111;">Client Name:</strong> ${name}</p>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong style="color: #111;">Email Address:</strong> <a href="mailto:${email}" style="color: #0066cc; text-decoration: none;">${email}</a></p>
            <p style="margin: 0 0 15px 0; font-size: 14px; color: #555;"><strong style="color: #111;">Phone Number:</strong> <a href="tel:${phone}" style="color: #0066cc; text-decoration: none;">${phone}</a></p>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
              <strong style="display: block; margin-bottom: 8px; color: #111; font-size: 14px;">Message/Requirements:</strong>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${message || 'No message provided.'}</div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <small style="color: #999; font-size: 11px;">This is an automated system alert. Data has been successfully synced with Atlas MongoDB cluster.</small>
          </div>
        </div>
      `
    };

    // Async mail transmission trigger
    await transporter.sendMail(mailOptions);


    // ---- 🔥 STEP 3: MAKE.COM WEBHOOK TRIGGER FOR WHATSAPP ----
    // Jo URL aapne copy kiya tha use hum secure rakhne ke liye Environment Variable me fetch karenge
    if (process.env.MAKE_WEBHOOK_URL) {
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
    }


    // Saari cheezein successful hone par final response send karein
    return res.status(200).json({ 
      success: true, 
      message: 'Lead processed successfully! DB updated, Mail and WhatsApp webhook triggered.' 
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