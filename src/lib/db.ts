import { Pool } from 'pg';
import crypto from 'crypto';

export interface Client {
  id: number;
  name: string;
  phone: string;
  businessName: string;
  address: string;
  category: 'High' | 'Medium' | 'Low';
  businessType?: string;
  infoSource?: string;
  customValues?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: number | null;
  createdByUsername?: string;
}

export interface ClientLog {
  id: number;
  clientId: number;
  logText: string;
  userId?: number;
  createdBy?: string;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'super_admin' | 'admin' | 'staff';
  canViewAll: boolean;
  createdAt: string;
}

// Password hashing utility functions
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
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
    // 1. Create tables (role allows super_admin, admin, staff)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK(role IN ('super_admin', 'admin', 'staff')) DEFAULT 'staff',
        "canViewAll" BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        "businessName" VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        category VARCHAR(50) NOT NULL CHECK(category IN ('High', 'Medium', 'Low')),
        "businessType" VARCHAR(255),
        "infoSource" VARCHAR(255),
        "customValues" TEXT DEFAULT '{}',
        "createdById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
    `);

    // 2. Run migrations/column expansions & update role constraint
    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS "businessType" VARCHAR(255);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS "infoSource" VARCHAR(255);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT FALSE;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS "createdById" INTEGER REFERENCES users(id) ON DELETE SET NULL;

      ALTER TABLE client_logs ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE client_logs ADD COLUMN IF NOT EXISTS "createdBy" VARCHAR(255);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS "canViewAll" BOOLEAN DEFAULT TRUE;
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('super_admin', 'admin', 'staff'));

      -- Migrate existing client createdById values from audit logs
      UPDATE clients c
      SET "createdById" = (
        SELECT "userId" 
        FROM client_logs l 
        WHERE l."clientId" = c.id 
          AND l."logText" LIKE '%Mendaftarkan client baru%'
        LIMIT 1
      )
      WHERE c."createdById" IS NULL;
    `);

    // 3. Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_category ON clients(category);
      CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
      CREATE INDEX IF NOT EXISTS idx_clients_businessName ON clients("businessName");
      CREATE INDEX IF NOT EXISTS idx_client_logs_clientId ON client_logs("clientId");
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // 4. Clean up legacy pin/unpin activity logs
    await client.query(`
      DELETE FROM client_logs 
      WHERE "logText" = 'Menyematkan (pin) client ke baris teratas.' 
         OR "logText" = 'Melepas sematan (unpin) client dari baris teratas.'
         OR "logText" LIKE '%Menyematkan (pin)%' 
         OR "logText" LIKE '%Melepas sematan (unpin)%';
    `);

    // 5. Seed initial accounts if empty
    const userCountRes = await client.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCountRes.rows[0].count, 10);
    if (userCount === 0) {
      const superSalt = crypto.randomBytes(16).toString('hex');
      const superHash = crypto.pbkdf2Sync('superadmin123', superSalt, 1000, 64, 'sha512').toString('hex');

      const adminSalt = crypto.randomBytes(16).toString('hex');
      const adminHash = crypto.pbkdf2Sync('admin123', adminSalt, 1000, 64, 'sha512').toString('hex');

      const staffSalt = crypto.randomBytes(16).toString('hex');
      const staffHash = crypto.pbkdf2Sync('staff123', staffSalt, 1000, 64, 'sha512').toString('hex');

      await client.query(`
        INSERT INTO users (username, password_hash, salt, role) VALUES 
        ('superadmin', $1, $2, 'super_admin'),
        ('admin', $3, $4, 'admin'),
        ('staff', $5, $6, 'staff')
      `, [superHash, superSalt, adminHash, adminSalt, staffHash, staffSalt]);
      console.log('Seeded initial accounts.');
    } else {
      // Make sure superadmin exists if other users exist (from older migrations)
      const superAdminRes = await client.query("SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'");
      const superAdminCount = parseInt(superAdminRes.rows[0].count, 10);
      if (superAdminCount === 0) {
        const superSalt = crypto.randomBytes(16).toString('hex');
        const superHash = crypto.pbkdf2Sync('superadmin123', superSalt, 1000, 64, 'sha512').toString('hex');
        await client.query(`
          INSERT INTO users (username, password_hash, salt, role) VALUES 
          ('superadmin', $1, $2, 'super_admin')
        `, [superHash, superSalt]);
        console.log('Seeded default super_admin account.');
      }
    }

  } catch (err) {
    console.error('Failed to initialize PostgreSQL database schema:', err);
  } finally {
    client.release();
  }
};

// Run database migrations/initialization
initDb();

export { pool };
