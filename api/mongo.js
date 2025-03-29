// MongoDB connection helper for Vercel
const { MongoClient } = require('mongodb');
const venues = require('../mongo-data/venues');
const events = require('../mongo-data/events');

// MongoDB Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://eventzen:eventzen123@cluster0.mongodb.net/eventzen?retryWrites=true&w=majority';
const DB_NAME = 'eventzen';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Connect to the MongoDB database
  const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  const db = client.db(DB_NAME);

  // Check if we need to initialize sample data
  await initializeData(db);

  // Cache the client and db connections
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

async function initializeData(db) {
  try {
    // Check if venues collection has data
    const venuesCollection = db.collection('venues');
    const venuesCount = await venuesCollection.countDocuments();
    
    if (venuesCount === 0) {
      console.log('Initializing venues data...');
      await venuesCollection.insertMany(venues);
      console.log('Venues data initialized!');
    }
    
    // Check if events collection has data
    const eventsCollection = db.collection('events');
    const eventsCount = await eventsCollection.countDocuments();
    
    if (eventsCount === 0) {
      console.log('Initializing events data...');
      await eventsCollection.insertMany(events);
      console.log('Events data initialized!');
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

module.exports = { connectToDatabase }; 