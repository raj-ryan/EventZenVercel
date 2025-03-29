// Simplified venues API for Vercel
const { db } = require('../server/db');
const { venues } = require('../shared/schema');

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
    console.log("Fetching venues from database");
    
    // Basic query with minimal fields
    const venuesList = await db.query.venues.findMany({
      limit: 50
    });
    
    console.log(`Successfully retrieved ${venuesList.length} venues`);
    return res.status(200).json(venuesList);
  } catch (error) {
    console.error("Failed to fetch venues:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch venues', 
      message: error.message
    });
  }
} 