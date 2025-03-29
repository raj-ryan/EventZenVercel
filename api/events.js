// Events API endpoint using MongoDB
const { connectToDatabase } = require('./mongo');

module.exports = async (req, res) => {
  console.log("Events API called:", req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const eventsCollection = db.collection('events');
    
    // Handle GET request (list events)
    if (req.method === 'GET') {
      console.log("Fetching events from MongoDB...");
      
      // Simple query to get events ordered by date
      const events = await eventsCollection
        .find({})
        .sort({ date: -1 })
        .limit(50)
        .toArray();
      
      console.log(`Retrieved ${events.length} events from MongoDB`);
      return res.status(200).json(events);
    }
    
    // Handle POST request (create event)
    else if (req.method === 'POST') {
      const eventData = req.body;
      
      if (!eventData || !eventData.name || !eventData.venueId) {
        return res.status(400).json({ error: 'Missing required event fields' });
      }
      
      // Set timestamps
      eventData.createdAt = new Date();
      eventData.updatedAt = new Date();
      
      // Insert new event
      const result = await eventsCollection.insertOne(eventData);
      const newEvent = await eventsCollection.findOne({ _id: result.insertedId });
      
      return res.status(201).json(newEvent);
    }
    
    // Handle other methods
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error("Error processing MongoDB request:", error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message
    });
  }
} 