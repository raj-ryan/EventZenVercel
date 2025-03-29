import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Global connection pool and db instance for connection reuse
let _pool: Pool | null = null;
let _db: any = null;

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing! This will cause database connection failures.");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if DATABASE_URL looks valid
const dbUrlValid = process.env.DATABASE_URL.startsWith('postgresql://');
console.log(`Database URL format ${dbUrlValid ? 'appears valid' : 'is INVALID!'}`);

// In serverless environments, we don't use WebSockets
// This prevents issues with serverless functions
if (process.env.NODE_ENV !== 'production') {
  console.log("Development environment: Using WebSocket for Neon");
  neonConfig.webSocketConstructor = ws;
} else {
  console.log("Production environment: Using HTTP for Neon");
  // In production we use HTTP instead of WebSockets
}

// Get or create connection pool with connection pooling for serverless 
export function getPool(): Pool {
  try {
    if (!_pool) {
      console.log("Creating new database pool");
      _pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        max: 10, // Maximum number of clients the pool should contain
        idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
        connectionTimeoutMillis: 10000, // Maximum time to wait for connection
      });
      
      // Test the connection immediately to validate
      _pool.connect()
        .then(() => console.log("✅ Database connection test successful"))
        .catch(err => console.error("❌ Database connection test failed:", err.message));
    }
    return _pool;
  } catch (error) {
    console.error("Error creating pool:", error);
    throw error;
  }
}

// Get or create Drizzle ORM instance
export function getDb() {
  try {
    if (!_db) {
      const pool = getPool();
      console.log("Initializing Drizzle ORM");
      _db = drizzle({ client: pool, schema });
    }
    return _db;
  } catch (error) {
    console.error("Error creating DB instance:", error);
    throw error;
  }
}

// Export pool and db for compatibility with existing code
export const pool = getPool();
export const db = getDb();

// Add some initial debugging - try a simple query to verify the connection
try {
  console.log("Running test query to verify database connection...");
  db.select({ result: schema.users.id }).limit(1).execute()
    .then((result: any) => console.log("✅ Test query successful:", result))
    .catch((err: Error) => console.error("❌ Test query failed:", err.message));
} catch (error) {
  console.error("Failed to run test query:", error);
}
