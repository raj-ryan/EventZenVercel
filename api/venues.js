// Simple static data handler for venues
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  console.log("Venues API called:", req.url);
  
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
    // Path to the static JSON file
    const dataPath = path.join(process.cwd(), 'api', 'data', 'venues.json');
    
    console.log("Reading static venues data...");
    
    // Read the file
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    const venues = JSON.parse(fileContents);
    
    console.log(`Successfully retrieved ${venues.length} venues from static data`);
    
    return res.status(200).json(venues);
  } catch (error) {
    console.error("Failed to fetch venues:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch venues', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 