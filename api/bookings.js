const { connectToDatabase } = require('./mongo.js');

// Export default function for Vercel serverless function
module.exports = async function handler(req, res) {
  // Set JSON content type header
  res.setHeader('Content-Type', 'application/json');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    console.log("Connecting to MongoDB for bookings...");
    const { db } = await connectToDatabase();
    console.log("Connected to MongoDB successfully");

    const bookingsCollection = db.collection('bookings');
    
    // GET all bookings
    if (req.method === 'GET') {
      const bookings = await bookingsCollection.find({}).toArray();
      return res.status(200).json(bookings);
    }
    
    // POST (create) new booking
    if (req.method === 'POST') {
      console.log("Creating new booking with data:", req.body);
      
      if (!req.body) {
        return res.status(400).json({ error: 'Missing booking data' });
      }
      
      // Determine if it's an event or venue booking
      const isEventBooking = !!req.body.eventId;
      const isVenueBooking = !!req.body.venueId;
      
      if (!isEventBooking && !isVenueBooking) {
        return res.status(400).json({ error: 'Either eventId or venueId must be provided' });
      }
      
      // Create the booking
      const bookingData = {
        ...req.body,
        id: Date.now(),
        createdAt: new Date(),
        status: req.body.status || 'confirmed',
        userId: req.body.userId || 1 // Default user ID
      };
      
      const result = await bookingsCollection.insertOne(bookingData);
      const newBooking = await bookingsCollection.findOne({ _id: result.insertedId });
      
      // Update event attendee count if it's an event booking
      if (isEventBooking) {
        const eventsCollection = db.collection('events');
        const eventId = typeof req.body.eventId === 'string' ? parseInt(req.body.eventId) : req.body.eventId;
        
        await eventsCollection.updateOne(
          { id: eventId },
          { $inc: { 'attendees.count': req.body.ticketCount || 1 } }
        );
      }
      
      console.log("Created new booking:", newBooking);
      
      return res.status(201).json(newBooking);
    }
    
    // Other methods not supported
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error("Error handling booking request:", error);
    return res.status(500).json({ 
      error: 'Failed to process booking request', 
      message: error.message
    });
  }
} 