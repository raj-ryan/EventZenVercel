// Simplified events API for Vercel
const { db } = require('../server/db');
const { events } = require('../shared/schema');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Fetching events from database");
    
    // Basic query with minimal fields
    const eventsList = await db.query.events.findMany({
      limit: 50
    });
    
    console.log(`Successfully retrieved ${eventsList.length} events`);
    return res.status(200).json(eventsList);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch events', 
      message: error.message
    });
  }
} 