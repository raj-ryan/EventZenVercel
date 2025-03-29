import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://rajaryan2021:BUirrO3n0pQdfmg4@eventzen.9whhscq.mongodb.net/eventzen?retryWrites=true&w=majority&appName=EventZen";
const DB_NAME = 'eventzen';

const venues = [
  {
    id: 1,
    name: "Grand Ballroom",
    address: "123 Main Street",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    capacity: 500,
    amenities: ["WiFi", "Catering", "Sound System", "Projector"],
    price: 2500.00,
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3",
    description: "Elegant ballroom for formal events and large gatherings",
    createdBy: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: "Tech Conference Center",
    address: "456 Innovation Drive",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    capacity: 300,
    amenities: ["WiFi", "AV Equipment", "Breakout Rooms", "Catering"],
    price: 1800.00,
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3",
    description: "Modern conference center perfect for tech events and workshops",
    createdBy: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    name: "Garden Terrace",
    address: "789 Park Avenue",
    city: "Chicago",
    state: "IL",
    zipCode: "60601",
    capacity: 150,
    amenities: ["Outdoor Space", "Catering", "Lighting", "Tent Option"],
    price: 1200.00,
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?ixlib=rb-4.0.3",
    description: "Beautiful outdoor venue for weddings and summer events",
    createdBy: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const events = [
  {
    id: 1,
    name: "Tech Innovation Summit",
    description: "A conference bringing together tech leaders to discuss the latest innovations",
    date: new Date("2025-05-15T09:00:00Z"),
    endDate: new Date("2025-05-16T17:00:00Z"),
    venueId: 2,
    capacity: 250,
    price: 150.00,
    category: "Technology",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop",
    createdBy: 1,
    status: "upcoming",
    isPublished: true,
    liveStatus: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: "Summer Garden Wedding Expo",
    description: "Showcase of wedding vendors and services for summer garden weddings",
    date: new Date("2025-04-10T10:00:00Z"),
    endDate: new Date("2025-04-10T18:00:00Z"),
    venueId: 3,
    capacity: 120,
    price: 50.00,
    category: "Wedding",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop",
    createdBy: 1,
    status: "upcoming",
    isPublished: true,
    liveStatus: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    name: "Business Networking Gala",
    description: "Annual networking event for business professionals",
    date: new Date("2025-06-20T18:00:00Z"),
    endDate: new Date("2025-06-20T22:00:00Z"),
    venueId: 1,
    capacity: 200,
    price: 100.00,
    category: "Business",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2069&auto=format&fit=crop",
    createdBy: 1,
    status: "upcoming",
    isPublished: true,
    liveStatus: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db(DB_NAME);
    
    // Initialize venues collection
    try {
      await db.collection('venues').drop();
      console.log('Dropped existing venues collection');
    } catch (error) {
      console.log('No existing venues collection to drop');
    }
    
    await db.createCollection('venues');
    await db.collection('venues').insertMany(venues);
    console.log('Venues collection initialized with sample data');
    
    // Initialize events collection
    try {
      await db.collection('events').drop();
      console.log('Dropped existing events collection');
    } catch (error) {
      console.log('No existing events collection to drop');
    }
    
    await db.createCollection('events');
    await db.collection('events').insertMany(events);
    console.log('Events collection initialized with sample data');

    // List all collections and their counts
    const collections = await db.listCollections().toArray();
    console.log('\nDatabase collections:');
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`- ${collection.name}: ${count} documents`);
    }

    await client.close();
    console.log('\nDatabase initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDatabase(); 