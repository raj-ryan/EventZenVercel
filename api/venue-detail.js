import { connectToDatabase } from './mongo.js';

// Export default function for Vercel serverless function
export default async function handler(req, res) {
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
    console.log("Connecting to MongoDB for venue detail...");
    const { db } = await connectToDatabase();
    console.log("Connected to MongoDB successfully");

    const venuesCollection = db.collection('venues');
    
    // Get ID from request path or query parameter
    const urlParts = req.url.split('/');
    let venueId = parseInt(req.query.id || urlParts[urlParts.length - 1]);
    
    console.log(`Looking for venue with ID: ${venueId}`);
    
    if (!venueId || isNaN(venueId)) {
      return res.status(400).json({ error: 'Valid venue ID is required' });
    }
    
    // Fetch the venue
    const venue = await venuesCollection.findOne({ id: venueId });
    
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    
    console.log("Venue found:", JSON.stringify(venue));
    
    // Return the venue data
    return res.status(200).json(venue);
    
  } catch (error) {
    console.error("Error fetching venue detail:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch venue detail', 
      message: error.message
    });
  }
} 