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
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

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
  if (!_pool) {
    console.log("Creating new database pool");
    _pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 10, // Maximum number of clients the pool should contain
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 10000, // Maximum time to wait for connection
    });
  }
  return _pool;
}

// Get or create Drizzle ORM instance
export function getDb() {
  if (!_db) {
    const pool = getPool();
    console.log("Initializing Drizzle ORM");
    _db = drizzle({ client: pool, schema });
  }
  return _db;
}

// Export pool and db for compatibility with existing code
export const pool = getPool();
export const db = getDb();
