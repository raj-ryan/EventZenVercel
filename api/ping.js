// Super simplified ping endpoint for Vercel
const { Pool } = require('@neondatabase/serverless');

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
    // Get database connection string
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error("No database connection string available");
      response.databaseError = "No connection string available";
    } else {
      // Create direct connection pool
      pool = new Pool({ connectionString });
      const result = await pool.query('SELECT NOW() as now');
      response.database = true;
      response.databaseTimestamp = result.rows[0].now;
      console.log('Database connection test successful');
    }
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