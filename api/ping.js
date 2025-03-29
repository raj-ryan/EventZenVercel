// Ping endpoint with MongoDB connection test
const { connectToDatabase } = require('./mongo');

async function handler(req, res) {
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
    database: false,
    type: 'MongoDB'
  };
  
  // Test MongoDB connection
  try {
    const { client, db } = await connectToDatabase();
    
    // Run a simple command to verify the connection
    const result = await db.command({ ping: 1 });
    
    if (result.ok === 1) {
      response.database = true;
      response.databaseTimestamp = new Date().toISOString();
      
      // Get collection counts
      const venues = await db.collection('venues').countDocuments();
      const events = await db.collection('events').countDocuments();
      
      response.collections = {
        venues,
        events
      };
      
      console.log('MongoDB connection test successful');
    }
  } catch (error) {
    console.error('MongoDB connection test failed:', error);
    response.databaseError = error.message;
  }
  
  res.status(200).json(response);
}

// Export the handler function for Vercel serverless functions
module.exports = handler; 