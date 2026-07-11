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
    const { name, email, phone, company, requirements } = req.body;

    // 1. Database mein save karein
    const { db } = await connectToDatabase();
    await db.collection('leads').insertOne({
      name,
      email,
      phone,
      company,
      requirements,
      createdAt: new Date()
    });

    // 2. Email Transporter Setup karein
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 3. Email Content tayyar karein
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'softwaresatlas@gmail.com', // Aapki target email
      subject: `🚨 New Lead Received from ${name}`,
      html: `
        <h3>New Project Lead Details:</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Company:</b> ${company || 'N/A'}</p>
        <p><b>Requirements:</b></p>
        <p style="background: #f4f4f4; padding: 10px; border-left: 4px solid #0070f3;">${requirements}</p>
      `,
    };

    // 4. Email send karein
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Lead saved and email sent successfully!' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || 'Something went wrong' });
  }
}