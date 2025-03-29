// Venues API endpoint using MongoDB
const { connectToDatabase } = require('./mongo');

// Export default function for Vercel serverless function
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log("Connecting to MongoDB...");
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    console.log("Connected to MongoDB successfully");

    const venuesCollection = db.collection('venues');
    
    // Handle GET request (list venues)
    if (req.method === 'GET') {
      console.log("Fetching venues from MongoDB...");
      
      try {
        // Simple query to get venues ordered by name
        const venues = await venuesCollection
          .find({})
          .sort({ name: 1 })
          .limit(50)
          .toArray();
        
        console.log(`Retrieved ${venues.length} venues from MongoDB`);
        return res.status(200).json(venues);
      } catch (error) {
        console.error("Error fetching venues:", error);
        return res.status(500).json({ 
          error: 'Failed to fetch venues',
          details: error.message
        });
      }
    }
    
    // Handle POST request (create venue)
    else if (req.method === 'POST') {
      const venueData = req.body;
      
      if (!venueData || !venueData.name || !venueData.address) {
        return res.status(400).json({ error: 'Missing required venue fields' });
      }
      
      try {
        // Set timestamps
        venueData.createdAt = new Date();
        venueData.updatedAt = new Date();
        
        // Insert new venue
        const result = await venuesCollection.insertOne(venueData);
        const newVenue = await venuesCollection.findOne({ _id: result.insertedId });
        
        console.log("Created new venue:", newVenue);
        return res.status(201).json(newVenue);
      } catch (error) {
        console.error("Error creating venue:", error);
        return res.status(500).json({ 
          error: 'Failed to create venue',
          details: error.message
        });
      }
    }
    
    // Handle other methods
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error("Error processing MongoDB request:", error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}; 