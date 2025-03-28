import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Cache connections across function invocations
let _pool: Pool | null = null;
let _db: any = null;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Initializing database connection...");

// Only use WebSockets in development, use HTTP in production (better for serverless)
if (process.env.NODE_ENV !== 'production') {
  console.log("Using WebSocket connection for development");
  neonConfig.webSocketConstructor = ws;
} else {
  console.log("Using HTTP connection for production");
}

// Get or create connection pool
export function getPool(): Pool {
  if (!_pool) {
    console.log("Creating new database pool");
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
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

// For backwards compatibility
export const pool = getPool();
export const db = getDb();
