// Vercel API handler
import express from 'express';
import cors from 'cors';
import { db, getDb } from '../server/db';
import { eq, desc, asc } from 'drizzle-orm';
import * as schema from '../shared/schema';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple ping endpoint for testing
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0'
  });
});

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    console.log("Fetching events from database...");
    const dbInstance = getDb();
    
    // Limit and offset
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    // Category filter
    const category = req.query.category;
    
    let query = dbInstance.select().from(schema.events);
    
    // Apply category filter if provided
    if (category) {
      query = query.where(eq(schema.events.category, category));
    }
    
    // Apply sorting, limit and offset
    const events = await query
      .orderBy(desc(schema.events.date))
      .limit(limit)
      .offset(offset);
    
    console.log(`Successfully fetched ${events.length} events`);
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      message: "Error fetching events",
      details: error.message
    });
  }
});

// Get all venues
app.get('/api/venues', async (req, res) => {
  try {
    console.log("Fetching venues from database...");
    const dbInstance = getDb();
    
    // Limit and offset
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    const venues = await dbInstance
      .select()
      .from(schema.venues)
      .orderBy(asc(schema.venues.name))
      .limit(limit)
      .offset(offset);
    
    console.log(`Successfully fetched ${venues.length} venues`);
    res.json(venues);
  } catch (error) {
    console.error("Error fetching venues:", error);
    res.status(500).json({
      message: "Error fetching venues",
      details: error.message
    });
  }
});

// Get venue by ID
app.get('/api/venues/:id', async (req, res) => {
  try {
    const venueId = parseInt(req.params.id);
    console.log(`Looking for venue with ID: ${venueId}`);
    
    const dbInstance = getDb();
    const [venue] = await dbInstance
      .select()
      .from(schema.venues)
      .where(eq(schema.venues.id, venueId));
    
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }
    
    const formattedVenue = {
      ...venue,
      createdAt: venue.createdAt?.toISOString(),
      updatedAt: venue.updatedAt?.toISOString()
    };
    
    res.json(formattedVenue);
  } catch (error) {
    console.error("Error getting venue:", error);
    res.status(500).json({
      message: "Error getting venue",
      details: error.message
    });
  }
});

// Default catch-all handler
app.all('*', (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.path}`
  });
});

export default app; 