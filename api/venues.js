// Venues API endpoint optimized for Vercel serverless
const { createPool, createDb } = require('../server/db');

module.exports = async (req, res) => {
  console.log("Venues API called:", req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Create a new connection for this request
  let pool;
  try {
    // Create a fresh pool for this request
    pool = createPool();
    
    // Create db instance
    const db = createDb(pool);
    
    // Handle GET request (list venues)
    if (req.method === 'GET') {
      console.log("Fetching venues list");
      
      // Use raw SQL for simplicity and reliability
      const result = await pool.query(`
        SELECT * FROM venues 
        ORDER BY name ASC
        LIMIT 100
      `);
      
      console.log(`Retrieved ${result.rows.length} venues`);
      return res.status(200).json(result.rows);
    }
    
    // Handle POST request (create venue)
    else if (req.method === 'POST') {
      console.log("Creating new venue");
      
      const venueData = req.body;
      
      if (!venueData || !venueData.name || !venueData.address) {
        return res.status(400).json({ error: 'Missing required venue fields' });
      }
      
      // Insert new venue with raw SQL
      const result = await pool.query(`
        INSERT INTO venues (name, address, city, state, zip_code, capacity, price, description, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `, [
        venueData.name, 
        venueData.address,
        venueData.city || '',
        venueData.state || '',
        venueData.zipCode || '',
        venueData.capacity || 0,
        venueData.price || 0,
        venueData.description || '',
        true
      ]);
      
      return res.status(201).json(result.rows[0]);
    }
    
    // Handle other methods
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error("Error processing venue request:", error);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      message: error.message
    });
  } finally {
    // Always close the pool when done
    if (pool) {
      try {
        await pool.end();
        console.log("Database connection closed");
      } catch (err) {
        console.error("Error closing database connection:", err);
      }
    }
  }
} 