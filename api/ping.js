// Ping endpoint with database connection test
const { createPool } = require('../server/db');

module.exports = async (req, res) => {
  console.log('Ping received at:', new Date().toISOString());
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'API is working properly!',
    vercel: true,
    database: false
  };
  
  // Test database connection
  let pool;
  try {
    pool = createPool();
    const result = await pool.query('SELECT NOW()');
    response.database = true;
    response.databaseTimestamp = result.rows[0].now;
    console.log('Database connection test successful');
  } catch (error) {
    console.error('Database connection test failed:', error);
    response.databaseError = error.message;
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error('Error closing pool:', err);
      }
    }
  }
  
  res.status(200).json(response);
} 