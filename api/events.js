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
  methods: 'GET,POST,OPTIONS'
}));
app.use(express.json());

// Handle all HTTP methods
const handler = async (req, res) => {
  console.log("Events API called with method:", req.method);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    console.log("Fetching events from database...");
    const dbInstance = getDb();
    
    // Limit and offset parameters
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    // Fetch events from database
    const eventsList = await dbInstance
      .select()
      .from(events)
      .orderBy(desc(events.date))
      .limit(limit)
      .offset(offset);
    
    console.log(`Successfully fetched ${eventsList.length} events`);
    return res.status(200).json(eventsList);
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({
      message: "Error fetching events",
      details: error.message
    });
  }
};

app.get('/api/events', handler);

export default app; 