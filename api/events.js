import { connectToDatabase } from './mongo.js';

// Export default function for Vercel serverless function
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log("Connecting to MongoDB...");
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    console.log("Connected to MongoDB successfully");

    const eventsCollection = db.collection('events');
    
    // Handle GET request for all events
    if (req.method === 'GET' && !req.query.id) {
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
    
    // Handle GET request for single event
    else if (req.method === 'GET' && req.query.id) {
      const eventId = parseInt(req.query.id);
      const event = await eventsCollection.findOne({ id: eventId });
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      return res.status(200).json(event);
    }
    
    // Handle POST request (create event)
    else if (req.method === 'POST') {
      const eventData = req.body;
      console.log('Received event data:', eventData);
      
      if (!eventData || !eventData.name || !eventData.venueId) {
        return res.status(400).json({ error: 'Missing required event fields' });
      }
      
      try {
        // Ensure numeric fields are properly typed
        const processedEventData = {
          ...eventData,
          id: Date.now(), // Generate a numeric ID
          venueId: parseInt(eventData.venueId),
          capacity: parseInt(eventData.capacity) || 100,
          price: parseFloat(eventData.price) || 0,
          createdBy: parseInt(eventData.createdBy) || 1,
          status: eventData.status || 'upcoming',
          isPublished: eventData.isPublished !== undefined ? eventData.isPublished : true,
          liveStatus: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          attendees: { count: 0 }
        };
        
        // Insert new event
        const result = await eventsCollection.insertOne(processedEventData);
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
    
    // Handle PUT request (update event)
    else if (req.method === 'PUT') {
      const eventId = parseInt(req.query.id);
      const updateData = req.body;

      if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
      }

      try {
        const result = await eventsCollection.updateOne(
          { id: eventId },
          { $set: { ...updateData, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Event not found' });
        }

        const updatedEvent = await eventsCollection.findOne({ id: eventId });
        return res.status(200).json(updatedEvent);
      } catch (error) {
        console.error("Error updating event:", error);
        return res.status(500).json({ 
          error: 'Failed to update event',
          details: error.message
        });
      }
    }
    
    // Handle DELETE request
    else if (req.method === 'DELETE') {
      const eventId = parseInt(req.query.id);

      if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required' });
      }

      try {
        const result = await eventsCollection.deleteOne({ id: eventId });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Event not found' });
        }

        return res.status(200).json({ message: 'Event deleted successfully' });
      } catch (error) {
        console.error("Error deleting event:", error);
        return res.status(500).json({ 
          error: 'Failed to delete event',
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