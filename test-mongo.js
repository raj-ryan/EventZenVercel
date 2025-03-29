import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://rajaryan2021:BUirrO3n0pQdfmg4@eventzen.9whhscq.mongodb.net/eventzen?retryWrites=true&w=majority&appName=EventZen";
const DB_NAME = 'eventzen';

async function testConnection() {
  console.log('Testing MongoDB connection...');
  
  try {
    const client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });

    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db(DB_NAME);
    
    // Test venues collection
    const venues = await db.collection('venues').countDocuments();
    console.log(`Found ${venues} venues`);
    
    // Test events collection
    const events = await db.collection('events').countDocuments();
    console.log(`Found ${events} events`);

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    await client.close();
    console.log('\nConnection closed successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

testConnection(); 