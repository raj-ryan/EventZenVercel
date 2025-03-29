import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://rajaryan2021:Chiku%4002215@eventzen.9whhscq.mongodb.net/eventzen?retryWrites=true&w=majority&authSource=admin";
const DB_NAME = 'eventzen';

async function testConnection() {
  console.log('Testing MongoDB connection...');
  
  try {
    const client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 15000,
      socketTimeoutMS: 60000,
      serverSelectionTimeoutMS: 15000,
      retryWrites: true,
      retryReads: true,
      maxPoolSize: 1,
      minPoolSize: 1,
      maxIdleTimeMS: 120000,
      ssl: true,
      tls: true,
      authSource: 'admin'
    });

    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db(DB_NAME);
    
    // Test venues collection
    const venuesCount = await db.collection('venues').countDocuments();
    console.log(`Found ${venuesCount} venues`);
    
    // Test events collection
    const eventsCount = await db.collection('events').countDocuments();
    console.log(`Found ${eventsCount} events`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:');
    for (const collection of collections) {
      console.log(`- ${collection.name}`);
    }

    await client.close();
    console.log('\nConnection closed successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

testConnection(); 