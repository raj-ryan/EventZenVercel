// Venues API endpoint using MongoDB
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

    const venuesCollection = db.collection('venues');
    
    // Handle GET request for all venues
    if (req.method === 'GET' && !req.query.id) {
      console.log("Fetching all venues...");
      try {
        const venues = await venuesCollection
          .find({})
          .sort({ name: 1 })
          .toArray();
        
        console.log(`Retrieved ${venues.length} venues`);
        return res.status(200).json(venues);
      } catch (error) {
        console.error("Error fetching venues:", error);
        return res.status(500).json({ 
          error: 'Failed to fetch venues',
          details: error.message
        });
      }
    }
    
    // Handle GET request for single venue
    else if (req.method === 'GET' && req.query.id) {
      console.log(`Fetching venue with ID: ${req.query.id}`);
      try {
        const venueId = parseInt(req.query.id);
        const venue = await venuesCollection.findOne({ id: venueId });
        
        if (!venue) {
          console.log(`Venue with ID ${venueId} not found`);
          return res.status(404).json({ error: 'Venue not found' });
        }
        
        console.log("Retrieved venue:", venue);
        return res.status(200).json(venue);
      } catch (error) {
        console.error("Error fetching venue:", error);
        return res.status(500).json({ 
          error: 'Failed to fetch venue',
          details: error.message
        });
      }
    }
    
    // Handle POST request (create venue)
    else if (req.method === 'POST') {
      const venueData = req.body;
      console.log('Received venue data:', venueData);

      if (!venueData || !venueData.name || !venueData.location) {
        return res.status(400).json({ error: 'Missing required venue fields' });
      }
      
      try {
        // Process venue data
        const processedVenueData = {
          ...venueData,
          id: Date.now(), // Generate a numeric ID
          capacity: parseInt(venueData.capacity) || 100,
          createdBy: parseInt(venueData.createdBy) || 1,
          status: venueData.status || 'active',
          isPublished: venueData.isPublished !== undefined ? venueData.isPublished : true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Insert new venue
        const result = await venuesCollection.insertOne(processedVenueData);
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
    
    // Handle PUT request (update venue)
    else if (req.method === 'PUT') {
      const venueId = parseInt(req.query.id);
      const updateData = req.body;

      if (!venueId) {
        return res.status(400).json({ error: 'Venue ID is required' });
      }

      try {
        const result = await venuesCollection.updateOne(
          { id: venueId },
          { $set: { ...updateData, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Venue not found' });
        }

        const updatedVenue = await venuesCollection.findOne({ id: venueId });
        return res.status(200).json(updatedVenue);
      } catch (error) {
        console.error("Error updating venue:", error);
        return res.status(500).json({ 
          error: 'Failed to update venue',
          details: error.message
        });
      }
    }
    
    // Handle DELETE request
    else if (req.method === 'DELETE') {
      const venueId = parseInt(req.query.id);

      if (!venueId) {
        return res.status(400).json({ error: 'Venue ID is required' });
      }

      try {
        const result = await venuesCollection.deleteOne({ id: venueId });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Venue not found' });
        }

        return res.status(200).json({ message: 'Venue deleted successfully' });
      } catch (error) {
        console.error("Error deleting venue:", error);
        return res.status(500).json({ 
          error: 'Failed to delete venue',
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