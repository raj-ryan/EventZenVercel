// Standalone Vercel serverless function for venues
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');

// Define schema inline to avoid imports
const venues = {
  id: { name: 'id' },
  name: { name: 'name' },
  address: { name: 'address' },
  city: { name: 'city' },
  state: { name: 'state' },
  zipCode: { name: 'zip_code' },
  capacity: { name: 'capacity' },
  amenities: { name: 'amenities' },
  price: { name: 'price' },
  image: { name: 'image' },
  description: { name: 'description' },
  createdBy: { name: 'created_by' },
  isActive: { name: 'is_active' },
  createdAt: { name: 'created_at' },
  updatedAt: { name: 'updated_at' }
};

module.exports = async (req, res) => {
  console.log("Venues API called:", req.url);
  
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
    
    console.log("Fetching venues from database using direct SQL...");
    
    // Execute raw SQL query to bypass any ORM issues
    const result = await pool.query(`
      SELECT * FROM venues 
      ORDER BY name ASC
      LIMIT 50
    `);
    
    // Close the pool after the query
    await pool.end();
    
    console.log(`Successfully retrieved ${result.rows.length} venues`);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch venues:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch venues', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 