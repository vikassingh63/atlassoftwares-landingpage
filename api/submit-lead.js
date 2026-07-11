// api/submit-lead.js
import { MongoClient } from 'mongodb';

// MongoDB Connection String (Vercel Env se aayegi)
const uri = process.env.MONGODB_URI; 
let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your MONGODB_URI to environment variables');
}

// Global cached connection pool to optimize serverless cold starts
if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
  // Sir, routing sirf POST request ko allow karegi
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, company, message } = req.body;

    // Basic Validation Check
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields (Name, Email, Message)' });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('atlas_softwares_db'); // Aapka database name
    const collection = db.collection('leads');        // Aapki collection (table) name

    // Insert Document structure
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
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}