// Standalone Vercel serverless function for events
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');

// Define schema inline to avoid imports
const events = {
  id: { name: 'id' },
  name: { name: 'name' },
  description: { name: 'description' },
  date: { name: 'date' },
  endDate: { name: 'end_date' },
  venueId: { name: 'venue_id' },
  capacity: { name: 'capacity' },
  price: { name: 'price' },
  category: { name: 'category' },
  image: { name: 'image' },
  createdBy: { name: 'created_by' },
  status: { name: 'status' },
  isPublished: { name: 'is_published' },
  liveStatus: { name: 'live_status' },
  createdAt: { name: 'created_at' },
  updatedAt: { name: 'updated_at' }
};

module.exports = async (req, res) => {
  console.log("Events API called:", req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get database connection string from environment variable
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error("No database connection string available");
      return res.status(500).json({ error: 'Database configuration missing' });
    }
    
    console.log("Connecting to database...");
    
    // Create a new pool for this request
    const pool = new Pool({ connectionString });
    
    // Create a Drizzle ORM instance
    const db = drizzle(pool);
    
    console.log("Fetching events from database using direct SQL...");
    
    // Execute raw SQL query to bypass any ORM issues
    const result = await pool.query(`
      SELECT * FROM events 
      ORDER BY date DESC
      LIMIT 50
    `);
    
    // Close the pool after the query
    await pool.end();
    
    console.log(`Successfully retrieved ${result.rows.length} events`);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch events', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 