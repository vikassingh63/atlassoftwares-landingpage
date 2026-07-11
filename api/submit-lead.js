import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';

const uri = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  const client = await MongoClient.connect(uri);
  const db = client.db('atlas_softwares_db');
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. req.body se saare fields nikal rahe hain (including message aur pageSource)
    const { name, email, phone, company, message, pageSource } = req.body;

    // Fallback fallbacks safe logic ke liye
    const projectRequirements = message || "No requirements provided";
    const source = pageSource || "Unknown Page";

    // 2. Database mein lead ko data entry karein
    const { db } = await connectToDatabase();
    await db.collection('leads').insertOne({
      name,
      email,
      phone,
      company,
      requirements: projectRequirements,
      pageSource: source, // Kis page se lead aayi track hoga
      createdAt: new Date()
    });

    // 3. Email Transporter Configuration (Gmail App Password ke sath)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 4. Email format tayyar karein
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'softwaresatlas@gmail.com', // Aapka official dynamic address
      subject: `🚨 New Lead [${source}] from ${name}`, // Email subject me source dikhega
      html: `
        <div style="font-family: 'Inter', sans-serif; color: #333; line-height: 1.6;">
          <h3 style="color: #111; border-bottom: 2px solid #eaeaea; padding-bottom: 8px;">New Project Lead Details</h3>
          <p><b>Lead Source:</b> <span style="color: #0070f3; font-weight: bold; background: #e6f4ea; padding: 2px 6px; border-radius: 4px;">${source}</span></p>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> <a href="mailto:${email}">${email}</a></p>
          <p><b>Phone:</b> ${phone || 'N/A'}</p>
          <p><b>Company:</b> ${company || 'N/A'}</p>
          <p><b>Project Requirements:</b></p>
          <div style="background: #f4f4f4; padding: 15px; border-left: 4px solid #0070f3; border-radius: 4px; font-style: italic;">
            ${projectRequirements}
          </div>
        </div>
      `,
    };

    // 5. Instantly mail send karein
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Lead saved and email sent successfully!' });

  } catch (error) {
    console.error("Error in submit-lead API:", error);
    return res.status(500).json({ message: error.message || 'Something went wrong on the server' });
  }
}