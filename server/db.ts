import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// Log environment for debugging
console.log("DB connection setup - Environment:", process.env.NODE_ENV);

// In serverless environments, we use Neon's HTTP protocol instead of WebSockets
if (process.env.NODE_ENV === 'production') {
  console.log("Production: Using HTTP protocol for Neon");
  // Don't set WebSocket in production (serverless)
} else {
  console.log("Development: Using WebSocket for Neon");
  neonConfig.webSocketConstructor = ws;
}

// For serverless functions, create connection on demand
export function createPool() {
  // Get connection string based on environment
  const connectionString = process.env.NODE_ENV === 'production' 
    ? process.env.DATABASE_URL_UNPOOLED 
    : process.env.DATABASE_URL;
    
  if (!connectionString) {
    console.error("DATABASE_URL not found in environment!");
    throw new Error("Database connection string missing");
  }
  
  console.log("Creating database connection pool");
  
  // Return a new pool with minimal configuration
  return new Pool({
    connectionString,
    max: 1
  });
}

// Create DB instance for a given pool
export function createDb(pool: Pool) {
  return drizzle(pool, { schema });
}

// For non-serverless use
let globalPool: Pool | null = null;

// Get a shared pool for development environment
export function getSharedPool() {
  if (!globalPool) {
    globalPool = createPool();
  }
  return globalPool;
}

// Get a shared db instance for development environment
export function getSharedDb() {
  const pool = getSharedPool();
  return createDb(pool);
}

// Export for direct use in development
export const db = getSharedDb();

// Run a test query to verify connection (only in non-production)
if (process.env.NODE_ENV !== 'production') {
  console.log("Testing database connection...");
  // Use raw SQL query via pool instead of Drizzle ORM
  getSharedPool().query('SELECT NOW() as now')
    .then(result => console.log("✅ Database connection test successful:", result.rows[0]))
    .catch(err => console.error("❌ Database connection test failed:", err));
}
