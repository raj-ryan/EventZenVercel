// Simple static data handler for events
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  console.log("Events API called:", req.url);
  
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
    const dataPath = path.join(process.cwd(), 'api', 'data', 'events.json');
    
    console.log("Reading static events data...");
    
    // Read the file
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    const events = JSON.parse(fileContents);
    
    console.log(`Successfully retrieved ${events.length} events from static data`);
    
    return res.status(200).json(events);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch events', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 