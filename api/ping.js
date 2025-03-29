// Simple ping endpoint for testing
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: '*',
  methods: 'GET,OPTIONS'
}));

app.get('/api/ping', (req, res) => {
  console.log('Ping received at:', new Date().toISOString());
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'API is working properly!',
    vercel: true
  });
});

export default app; 