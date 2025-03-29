// Super simplified Venues API endpoint for Vercel
const { Pool } = require('@neondatabase/serverless');

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

  // Only handle GET requests for now to fix the display issue
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let pool;
  try {
    // Get database connection string
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error("No database connection string available");
      return res.status(500).json({ error: 'Database configuration missing' });
    }
    
    // Create direct connection pool
    pool = new Pool({ connectionString });
    
    console.log("Running venues query...");
    
    // Simple query to get venues
    const result = await pool.query(`
      SELECT * FROM venues
      ORDER BY name ASC
      LIMIT 50
    `);
    
    console.log(`Got ${result.rows.length} venues`);
    
    // Return result
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ 
      error: 'Could not fetch venues',
      message: error.message
    });
  } finally {
    // Close pool
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error("Error closing pool:", err);
      }
    }
  }
} 