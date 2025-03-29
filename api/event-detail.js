const { connectToDatabase } = require('./mongo.js');

// Export default function for Vercel serverless function
module.exports = async function handler(req, res) {
  // Set JSON content type header
  res.setHeader('Content-Type', 'application/json');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Connecting to MongoDB for event detail...");
    const { db } = await connectToDatabase();
    console.log("Connected to MongoDB successfully");

    const eventsCollection = db.collection('events');
    
    // Get ID from request path or query parameter
    const urlParts = req.url.split('/');
    let eventId = parseInt(req.query.id || urlParts[urlParts.length - 1]);
    
    console.log(`Looking for event with ID: ${eventId}`);
    
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ error: 'Valid event ID is required' });
    }
    
    // Fetch the event
    const event = await eventsCollection.findOne({ id: eventId });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    console.log("Event found:", JSON.stringify(event));
    
    // Return the event data
    return res.status(200).json(event);
    
  } catch (error) {
    console.error("Error fetching event detail:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch event detail', 
      message: error.message
    });
  }
} 