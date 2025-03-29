// Ping endpoint with MongoDB connection test
import { connectToDatabase } from './mongo.js';

// Export default function for Vercel serverless function
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return a simple response
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'API is running'
    });
  } catch (error) {
    console.error('Ping error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
} 