// Dedicated Vercel serverless function for venues
import { getDb } from '../server/db';
import { venues } from '../shared/schema';
import { asc, eq } from 'drizzle-orm';
import cors from 'cors';
import express from 'express';

// Create Express instance for this endpoint
const app = express();
app.use(cors({
  origin: '*',
  methods: 'GET,POST,OPTIONS'
}));
app.use(express.json());

// Handler for venue routes
const handler = async (req, res) => {
  console.log("Venues API called with method:", req.method, "Path:", req.url);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const dbInstance = getDb();
    
    // Check if we're getting a specific venue by ID
    const venueIdMatch = req.url.match(/\/api\/venues\/(\d+)/);
    
    if (venueIdMatch) {
      // Get venue by ID
      const venueId = parseInt(venueIdMatch[1]);
      console.log(`Looking for venue with ID: ${venueId}`);
      
      const [venue] = await dbInstance
        .select()
        .from(venues)
        .where(eq(venues.id, venueId));
      
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      const formattedVenue = {
        ...venue,
        createdAt: venue.createdAt?.toISOString(),
        updatedAt: venue.updatedAt?.toISOString()
      };
      
      return res.status(200).json(formattedVenue);
    } else {
      // Get all venues
      console.log("Fetching all venues...");
      
      // Limit and offset
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset) : 0;
      
      const venuesList = await dbInstance
        .select()
        .from(venues)
        .orderBy(asc(venues.name))
        .limit(limit)
        .offset(offset);
      
      console.log(`Successfully fetched ${venuesList.length} venues`);
      return res.status(200).json(venuesList);
    }
  } catch (error) {
    console.error("Error with venues:", error);
    return res.status(500).json({
      message: "Error processing venue request",
      details: error.message
    });
  }
};

app.get('/api/venues', handler);
app.get('/api/venues/:id', handler);

export default app; 