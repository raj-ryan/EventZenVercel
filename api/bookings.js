import { connectToDatabase } from './mongo.js';

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
    const { db } = await connectToDatabase();
    const bookingsCollection = db.collection('bookings');
    const eventsCollection = db.collection('events');

    // Handle GET request (list bookings)
    if (req.method === 'GET') {
      const bookings = await bookingsCollection.find({}).toArray();
      return res.status(200).json(bookings);
    }

    // Handle POST request (create booking)
    else if (req.method === 'POST') {
      const bookingData = req.body;
      console.log('Received booking data:', bookingData);

      if (!bookingData || !bookingData.eventId || !bookingData.userId) {
        return res.status(400).json({ error: 'Missing required booking fields' });
      }

      try {
        // Check if event exists and has available capacity
        const event = await eventsCollection.findOne({ id: parseInt(bookingData.eventId) });
        
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }

        // Get current bookings count for the event
        const currentBookings = await bookingsCollection.countDocuments({ 
          eventId: parseInt(bookingData.eventId),
          status: { $in: ['confirmed', 'pending'] }
        });

        if (currentBookings >= event.capacity) {
          return res.status(400).json({ error: 'Event is fully booked' });
        }

        // Process booking data
        const processedBookingData = {
          ...bookingData,
          id: Date.now(),
          eventId: parseInt(bookingData.eventId),
          userId: parseInt(bookingData.userId),
          status: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Create booking
        const result = await bookingsCollection.insertOne(processedBookingData);
        
        // Update event attendees count
        await eventsCollection.updateOne(
          { id: parseInt(bookingData.eventId) },
          { 
            $inc: { 'attendees.count': 1 },
            $set: { updatedAt: new Date() }
          }
        );

        const newBooking = await bookingsCollection.findOne({ _id: result.insertedId });
        console.log("Created new booking:", newBooking);
        
        return res.status(201).json(newBooking);
      } catch (error) {
        console.error("Error creating booking:", error);
        return res.status(500).json({ 
          error: 'Failed to create booking',
          details: error.message
        });
      }
    }

    // Handle PUT request (update booking)
    else if (req.method === 'PUT') {
      const bookingId = parseInt(req.query.id);
      const updateData = req.body;

      if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }

      try {
        const result = await bookingsCollection.updateOne(
          { id: bookingId },
          { $set: { ...updateData, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        const updatedBooking = await bookingsCollection.findOne({ id: bookingId });
        return res.status(200).json(updatedBooking);
      } catch (error) {
        console.error("Error updating booking:", error);
        return res.status(500).json({ 
          error: 'Failed to update booking',
          details: error.message
        });
      }
    }

    // Handle DELETE request
    else if (req.method === 'DELETE') {
      const bookingId = parseInt(req.query.id);

      if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }

      try {
        // Get booking details before deletion
        const booking = await bookingsCollection.findOne({ id: bookingId });
        
        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        // Delete booking
        const result = await bookingsCollection.deleteOne({ id: bookingId });

        // Update event attendees count
        if (booking.status === 'confirmed') {
          await eventsCollection.updateOne(
            { id: booking.eventId },
            { 
              $inc: { 'attendees.count': -1 },
              $set: { updatedAt: new Date() }
            }
          );
        }

        return res.status(200).json({ message: 'Booking deleted successfully' });
      } catch (error) {
        console.error("Error deleting booking:", error);
        return res.status(500).json({ 
          error: 'Failed to delete booking',
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