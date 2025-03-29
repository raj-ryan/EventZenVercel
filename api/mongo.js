// MongoDB connection helper for Vercel
import { MongoClient } from 'mongodb';

// Import data using dynamic import for ESM compatibility
const venues = await import('./data/venues.js').then(m => m.default || m);
const events = await import('./data/events.js').then(m => m.default || m);

// MongoDB Connection URI from environment variable
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'eventzen';

// Global variables for caching the database connection
let cachedClient = null;
let cachedDb = null;
let connectionPromise = null;

/**
 * Connect to MongoDB with connection caching optimized for serverless functions
 */
export async function connectToDatabase() {
  // If we already have a cached connection, use it
  if (cachedClient && cachedDb) {
    console.log("Using cached database connection");
    return { client: cachedClient, db: cachedDb };
  }

  // If a connection is in progress, wait for it
  if (connectionPromise) {
    console.log("Waiting for existing connection promise to resolve");
    return connectionPromise;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  console.log("Establishing new MongoDB connection");

  try {
    // Create a new connection promise
    connectionPromise = new Promise(async (resolve, reject) => {
      try {
        // Connect to the MongoDB database
        const client = new MongoClient(MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 30000,
        });

        await client.connect();
        console.log("Connected to MongoDB successfully");

        const db = client.db(DB_NAME);
        console.log("Selected database:", DB_NAME);

        // Initialize sample data if needed
        await initializeData(db);

        // Cache the client and db connections
        cachedClient = client;
        cachedDb = db;

        console.log("MongoDB connection successful");
        resolve({ client, db });
      } catch (error) {
        console.error("MongoDB connection error:", error);
        connectionPromise = null;
        reject(error);
      }
    });

    return await connectionPromise;
  } catch (error) {
    console.error("Error in connectToDatabase:", error);
    connectionPromise = null;
    throw error;
  }
}

/**
 * Initialize sample data if collections are empty
 */
async function initializeData(db) {
  try {
    // Check if venues collection has data
    const venuesCollection = db.collection('venues');
    const venuesCount = await venuesCollection.countDocuments();
    
    if (venuesCount === 0) {
      console.log('Initializing venues data...');
      await venuesCollection.insertMany(venues);
      console.log('Venues data initialized!');
    } else {
      console.log(`Venues collection already has ${venuesCount} documents`);
    }
    
    // Check if events collection has data
    const eventsCollection = db.collection('events');
    const eventsCount = await eventsCollection.countDocuments();
    
    if (eventsCount === 0) {
      console.log('Initializing events data...');
      await eventsCollection.insertMany(events);
      console.log('Events data initialized!');
    } else {
      console.log(`Events collection already has ${eventsCount} documents`);
    }
  } catch (error) {
    console.error('Error initializing data:', error);
    throw error;
  }
} 