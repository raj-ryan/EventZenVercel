// Dedicated Vercel serverless function for events
import { getDb } from '../server/db';
import { events } from '../shared/schema';
import { desc } from 'drizzle-orm';
import cors from 'cors';
import express from 'express';

// Create Express instance for this endpoint
const app = express();
app.use(cors({
  origin: '*',
  methods: 'GET,POST,OPTIONS',
  credentials: true
}));
app.use(express.json());

// Direct serverless handler for Vercel
export default async function handler(req, res) {
  console.log("Events API called with method:", req.method, "URL:", req.url);
  
  if (req.method === 'OPTIONS') {
    // Handle CORS preflight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    console.log("Fetching events from database...");
    const dbInstance = getDb();
    
    // Limit and offset parameters (default values if not provided)
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    // Fetch events from database with more generous limits
    const eventsList = await dbInstance
      .select()
      .from(events)
      .orderBy(desc(events.date))
      .limit(limit)
      .offset(offset);
    
    console.log(`Successfully fetched ${eventsList.length} events`);
    
    // Set CORS headers explicitly
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(eventsList);
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({
      message: "Error fetching events",
      details: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
} 