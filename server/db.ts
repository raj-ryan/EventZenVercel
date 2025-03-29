import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

// For debugging
console.log("DB connection setup starting...");
console.log("Node environment:", process.env.NODE_ENV);

// Direct connection for serverless environment
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("⚠️ DATABASE_URL is not set in environment variables");
  // For development fallback
  connectionString = "postgresql://localhost:5432/eventzen";
}

console.log("Using database connection string:", connectionString.replace(/:.+@/, ':*****@'));

// In serverless environments, we don't use WebSockets
if (process.env.NODE_ENV !== 'production') {
  console.log("Development environment: Using WebSocket for Neon");
  neonConfig.webSocketConstructor = ws;
} else {
  console.log("Production environment: Using HTTP for Neon");
  // In production we use HTTP instead of WebSockets
}

// Create a single pool instance
const pool = new Pool({ 
  connectionString,
  max: 10
});

// Create a single db instance
const db = drizzle(pool, { schema });

// Get pool function (returns existing pool)
export function getPool() {
  return pool;
}

// Get db function (returns existing db)
export function getDb() {
  return db;
}

// Export for direct use
export { pool, db };

// Run a test query to verify connection (only in non-production)
if (process.env.NODE_ENV !== 'production') {
  console.log("Testing database connection...");
  db.select({ now: sql`NOW()` })
    .execute()
    .then(result => console.log("✅ Database connection test successful:", result))
    .catch(err => console.error("❌ Database connection test failed:", err));
}
