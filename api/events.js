// Simple Vercel serverless function for events
import { getDb } from '../server/db';
import { events } from '../shared/schema';
import { desc } from 'drizzle-orm';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Fetching events from database...");
    
    // Use direct query - no DB connection pooling here
    const dbInstance = getDb();
    
    // Get all events
    const eventsList = await dbInstance
      .select()
      .from(events)
      .limit(50);
    
    console.log(`Fetched ${eventsList.length} events`);
    
    // Return events as JSON
    return res.status(200).json(eventsList);
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch events',
      message: error.message 
    });
  }
} 