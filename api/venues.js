// Simple Vercel serverless function for venues
import { getDb } from '../server/db';
import { venues } from '../shared/schema';
import { asc } from 'drizzle-orm';

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
    console.log("Fetching venues from database...");
    
    // Use direct query
    const dbInstance = getDb();
    
    // Get all venues
    const venuesList = await dbInstance
      .select()
      .from(venues)
      .limit(50);
    
    console.log(`Fetched ${venuesList.length} venues`);
    
    // Return venues as JSON
    return res.status(200).json(venuesList);
  } catch (error) {
    console.error("Error fetching venues:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch venues',
      message: error.message 
    });
  }
} 