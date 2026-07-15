'use server';

import { pool, Client, ClientLog } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface ClientWithLogs extends Client {
  logs: ClientLog[];
}

export async function getClients(search = '', category = '', page = 1, limit = 12) {
  try {
    let whereClause = ' WHERE 1=1';
    const params: (string | number)[] = [];
    let pCount = 1;

    if (search.trim()) {
      whereClause += ` AND (name ILIKE $${pCount} OR "businessName" ILIKE $${pCount + 1} OR phone ILIKE $${pCount + 2} OR address ILIKE $${pCount + 3})`;
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
      pCount += 4;
    }

    if (category && category !== 'ALL') {
      whereClause += ` AND category = $${pCount}`;
      params.push(category);
      pCount += 1;
    }

    // Get total count for pagination
    const countRes = await pool.query(`SELECT COUNT(*) as count FROM clients${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Fetch paginated records
    const offset = (page - 1) * limit;
    params.push(limit, offset);
    const query = `SELECT * FROM clients${whereClause} ORDER BY "updatedAt" DESC LIMIT $${pCount} OFFSET $${pCount + 1}`;
    
    const res = await pool.query(query, params);
    const clients = res.rows as Client[];

    return { 
      success: true, 
      data: {
        clients,
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching clients:', error);
    return { success: false, error: 'Failed to fetch clients' };
  }
}

export async function getClientWithLogs(id: number) {
  try {
    const clientRes = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    const client = clientRes.rows[0] as Client | undefined;

    if (!client) {
      return { success: false, error: 'Client not found' };
    }

    const logsRes = await pool.query('SELECT * FROM client_logs WHERE "clientId" = $1 ORDER BY "createdAt" DESC', [id]);
    const logs = logsRes.rows as ClientLog[];

    return { success: true, data: { ...client, logs } as ClientWithLogs };
  } catch (error) {
    console.error('Error fetching client details:', error);
    return { success: false, error: 'Failed to fetch client details' };
  }
}

export async function createClient(
  clientData: {
    name: string;
    phone: string;
    businessName: string;
    address: string;
    category: 'High' | 'Medium' | 'Low';
    customValues?: string;
  },
  initialLog?: string
) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const clientQuery = `
      INSERT INTO clients (name, phone, "businessName", address, category, "customValues", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    const clientParams = [
      clientData.name,
      clientData.phone,
      clientData.businessName,
      clientData.address,
      clientData.category,
      clientData.customValues || '{}'
    ];
    
    const clientRes = await dbClient.query(clientQuery, clientParams);
    const clientId = clientRes.rows[0].id as number;

    if (initialLog && initialLog.trim()) {
      const logQuery = `
        INSERT INTO client_logs ("clientId", "logText", "createdAt")
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `;
      await dbClient.query(logQuery, [clientId, initialLog.trim()]);
    }

    await dbClient.query('COMMIT');
    revalidatePath('/');
    return { success: true, data: { id: clientId } };
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error creating client:', error);
    return { success: false, error: 'Failed to create client' };
  } finally {
    dbClient.release();
  }
}

export async function updateClient(
  id: number,
  clientData: {
    name: string;
    phone: string;
    businessName: string;
    address: string;
    category: 'High' | 'Medium' | 'Low';
    customValues?: string;
  }
) {
  try {
    const query = `
      UPDATE clients
      SET name = $1, phone = $2, "businessName" = $3, address = $4, category = $5, "customValues" = $6, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $7
    `;
    const params = [
      clientData.name,
      clientData.phone,
      clientData.businessName,
      clientData.address,
      clientData.category,
      clientData.customValues || '{}',
      id
    ];

    const result = await pool.query(query, params);
    
    if (result.rowCount === 0) {
      return { success: false, error: 'Client not found or no changes made' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating client:', error);
    return { success: false, error: 'Failed to update client' };
  }
}

export async function deleteClient(id: number) {
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: 'Failed to delete client' };
  }
}

export async function addClientLog(clientId: number, logText: string) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const logQuery = `
      INSERT INTO client_logs ("clientId", "logText", "createdAt")
      VALUES ($1, $2, CURRENT_TIMESTAMP)
    `;
    await dbClient.query(logQuery, [clientId, logText.trim()]);

    const updateQuery = `
      UPDATE clients SET "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1
    `;
    await dbClient.query(updateQuery, [clientId]);

    await dbClient.query('COMMIT');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error adding log:', error);
    return { success: false, error: 'Failed to add log' };
  } finally {
    dbClient.release();
  }
}

export async function getCustomFields() {
  try {
    const res = await pool.query("SELECT value FROM settings WHERE key = 'custom_fields'");
    const row = res.rows[0] as { value: string } | undefined;
    if (!row) {
      return { success: true, data: [] as string[] };
    }
    const fields = JSON.parse(row.value) as string[];
    return { success: true, data: fields };
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return { success: false, error: 'Failed to fetch custom fields', data: [] as string[] };
  }
}

export async function saveCustomFields(fields: string[]) {
  try {
    const query = `
      INSERT INTO settings (key, value)
      VALUES ('custom_fields', $1)
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `;
    await pool.query(query, [JSON.stringify(fields)]);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error saving custom fields:', error);
    return { success: false, error: 'Failed to save custom fields' };
  }
}
