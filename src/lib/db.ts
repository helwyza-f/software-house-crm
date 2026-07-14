import Database from 'better-sqlite3';
import path from 'path';

// Define types
export interface Client {
  id: number;
  name: string;
  phone: string;
  businessName: string;
  address: string;
  category: 'High' | 'Medium' | 'Low';
  createdAt: string;
  updatedAt: string;
}

export interface ClientLog {
  id: number;
  clientId: number;
  logText: string;
  createdAt: string;
}

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'clients.db');

declare global {
  // eslint-disable-next-line no-var
  var _sqliteDb: Database.Database | undefined;
}

let db: Database.Database;

if (process.env.NODE_ENV === 'production') {
  db = new Database(dbPath);
} else {
  if (!globalThis._sqliteDb) {
    globalThis._sqliteDb = new Database(dbPath);
  }
  db = globalThis._sqliteDb;
}

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    businessName TEXT NOT NULL,
    address TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('High', 'Medium', 'Low')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS client_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    logText TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES clients (id) ON DELETE CASCADE
  );
`);

export { db };
