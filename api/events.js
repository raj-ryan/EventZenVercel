// Events API endpoint optimized for Vercel serverless
const { createPool, createDb } = require('../server/db');

module.exports = async (req, res) => {
  console.log("Events API called:", req.url);
  
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
    
    // Handle GET request (list events)
    if (req.method === 'GET') {
      console.log("Fetching events list");
      
      // Use raw SQL for simplicity and reliability
      const result = await pool.query(`
        SELECT * FROM events 
        ORDER BY date DESC
        LIMIT 100
      `);
      
      console.log(`Retrieved ${result.rows.length} events`);
      return res.status(200).json(result.rows);
    }
    
    // Handle POST request (create event)
    else if (req.method === 'POST') {
      console.log("Creating new event");
      
      const eventData = req.body;
      
      if (!eventData || !eventData.name || !eventData.date || !eventData.venueId) {
        return res.status(400).json({ error: 'Missing required event fields' });
      }
      
      // Insert new event with raw SQL
      const result = await pool.query(`
        INSERT INTO events (name, description, date, end_date, venue_id, capacity, price, category, image, created_by, status, is_published, live_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `, [
        eventData.name, 
        eventData.description || '',
        eventData.date,
        eventData.endDate || eventData.date,
        eventData.venueId,
        eventData.capacity || 0,
        eventData.price || 0,
        eventData.category || 'Other',
        eventData.image || '',
        eventData.createdBy || 1,
        eventData.status || 'upcoming',
        eventData.isPublished || true,
        eventData.liveStatus || true
      ]);
      
      return res.status(201).json(result.rows[0]);
    }
    
    // Handle other methods
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error("Error processing event request:", error);
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