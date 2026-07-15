import { Pool } from 'pg';

export interface Client {
  id: number;
  name: string;
  phone: string;
  businessName: string;
  address: string;
  category: 'High' | 'Medium' | 'Low';
  customValues?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientLog {
  id: number;
  clientId: number;
  logText: string;
  createdAt: string;
}

// PostgreSQL connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/crm';

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({ connectionString });
} else {
  if (!globalThis._pgPool) {
    globalThis._pgPool = new Pool({ connectionString });
  }
  pool = globalThis._pgPool;
}

// Initialize database schema
const initDb = async () => {
  const client = await pool.connect();
  try {
    // We use quoted column names to preserve camelCase for TypeScript compatibility
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        "businessName" VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        category VARCHAR(50) NOT NULL CHECK(category IN ('High', 'Medium', 'Low')),
        "customValues" TEXT DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS client_logs (
        id SERIAL PRIMARY KEY,
        "clientId" INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        "logText" TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_clients_category ON clients(category);
      CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
      CREATE INDEX IF NOT EXISTS idx_clients_businessName ON clients("businessName");
      CREATE INDEX IF NOT EXISTS idx_client_logs_clientId ON client_logs("clientId");
    `);
  } catch (err) {
    console.error('Failed to initialize PostgreSQL database schema:', err);
  } finally {
    client.release();
  }
};

// Run database migrations/initialization
initDb();

export { pool };
