// api/submit-lead.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please add your MONGODB_URI to environment variables');
}

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
      return { client: cachedClient, db: cachedDb };
    }
  
    // Sir, yahan se options hatakar bas seedhe uri paas karna hai
    const client = await MongoClient.connect(uri);
    const db = client.db('atlas_softwares_db');
  
    cachedClient = client;
    cachedDb = db;
    return { client, db };
  }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, company, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields (Name, Email, Message)' });
    }

    // Database connection invoke karein
    const { db } = await connectToDatabase();
    const collection = db.collection('leads');

    const newLead = {
      name,
      email,
      phone: phone || '',
      company: company || '',
      message,
      createdAt: new Date()
    };

    const result = await collection.insertOne(newLead);

    return res.status(200).json({ success: true, message: 'Lead saved successfully', id: result.insertedId });
  } catch (error) {
    console.error('Database insertion failed:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}