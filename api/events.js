import { connectToDatabase } from './mongo.js';

// Export default function for Vercel serverless function
export default async function handler(req, res) {
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

    const eventsCollection = db.collection('events');
    
    // Handle GET request (list events)
    if (req.method === 'GET') {
      console.log("Fetching events from MongoDB...");
      
      try {
        // Simple query to get events ordered by date
        const events = await eventsCollection
          .find({})
          .sort({ date: -1 })
          .limit(50)
          .toArray();
        
        console.log(`Retrieved ${events.length} events from MongoDB`);
        return res.status(200).json(events);
      } catch (error) {
        console.error("Error fetching events:", error);
        return res.status(500).json({ 
          error: 'Failed to fetch events',
          details: error.message
        });
      }
    }
    
    // Handle POST request (create event)
    else if (req.method === 'POST') {
      const eventData = req.body;
      
      if (!eventData || !eventData.name || !eventData.venueId) {
        return res.status(400).json({ error: 'Missing required event fields' });
      }
      
      try {
        // Set timestamps
        eventData.createdAt = new Date();
        eventData.updatedAt = new Date();
        
        // Insert new event
        const result = await eventsCollection.insertOne(eventData);
        const newEvent = await eventsCollection.findOne({ _id: result.insertedId });
        
        console.log("Created new event:", newEvent);
        return res.status(201).json(newEvent);
      } catch (error) {
        console.error("Error creating event:", error);
        return res.status(500).json({ 
          error: 'Failed to create event',
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
} 