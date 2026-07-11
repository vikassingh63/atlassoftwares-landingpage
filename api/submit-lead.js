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
    // Sir, frontend se 'message' aa rha hai, toh humne use yahan destructure kar liya hai
    const { name, email, phone, company, message } = req.body;

    // Ek safe fallback variable bana liya hai
    const projectRequirements = message || "No requirements provided";

    // 1. Database mein save karein
    const { db } = await connectToDatabase();
    await db.collection('leads').insertOne({
      name,
      email,
      phone,
      company,
      requirements: projectRequirements, // Ab DB mein bilkul sahi text jayega
      createdAt: new Date()
    });

    // 2. Email Transporter Setup
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
      to: 'softwaresatlas@gmail.com',
      subject: `🚨 New Lead Received from ${name}`,
      html: `
        <h3>New Project Lead Details:</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Company:</b> ${company || 'N/A'}</p>
        <p><b>Requirements:</b></p>
        <p style="background: #f4f4f4; padding: 10px; border-left: 4px solid #0070f3;">${projectRequirements}</p>
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