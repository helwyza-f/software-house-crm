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
      whereClause += ` AND (name ILIKE $${pCount} OR "businessName" ILIKE $${pCount + 1} OR phone ILIKE $${pCount + 2} OR address ILIKE $${pCount + 3} OR "businessType" ILIKE $${pCount + 4} OR "infoSource" ILIKE $${pCount + 5})`;
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
      pCount += 6;
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
    businessType?: string;
    infoSource?: string;
    customValues?: string;
  },
  initialLog?: string
) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const clientQuery = `
      INSERT INTO clients (name, phone, "businessName", address, category, "businessType", "infoSource", "customValues", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    const clientParams = [
      clientData.name,
      clientData.phone,
      clientData.businessName,
      clientData.address,
      clientData.category,
      clientData.businessType || '',
      clientData.infoSource || '',
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
    businessType?: string;
    infoSource?: string;
    customValues?: string;
  }
) {
  try {
    const query = `
      UPDATE clients
      SET name = $1, phone = $2, "businessName" = $3, address = $4, category = $5, "businessType" = $6, "infoSource" = $7, "customValues" = $8, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $9
    `;
    const params = [
      clientData.name,
      clientData.phone,
      clientData.businessName,
      clientData.address,
      clientData.category,
      clientData.businessType || '',
      clientData.infoSource || '',
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

// Default options for global dropdown fields
const DEFAULT_BUSINESS_TYPES = ['UMKM', 'Corporate', 'Startup'];
const DEFAULT_INFO_SOURCES = ['Instagram', 'Website', 'Rekomendasi Teman'];

export async function getGlobalOptions() {
  try {
    const res = await pool.query("SELECT key, value FROM settings WHERE key IN ('options_business_type', 'options_info_source')");
    
    let businessTypes = [...DEFAULT_BUSINESS_TYPES];
    let infoSources = [...DEFAULT_INFO_SOURCES];

    res.rows.forEach((row: { key: string; value: string }) => {
      if (row.key === 'options_business_type') {
        businessTypes = JSON.parse(row.value);
      } else if (row.key === 'options_info_source') {
        infoSources = JSON.parse(row.value);
      }
    });

    return { success: true, data: { businessTypes, infoSources } };
  } catch (error) {
    console.error('Error getting global options:', error);
    return { 
      success: false, 
      error: 'Failed to load options',
      data: { businessTypes: DEFAULT_BUSINESS_TYPES, infoSources: DEFAULT_INFO_SOURCES }
    };
  }
}

export async function addGlobalOption(type: 'businessType' | 'infoSource', value: string) {
  try {
    const valTrim = value.trim();
    if (!valTrim) return { success: false, error: 'Opsi tidak boleh kosong' };

    const key = type === 'businessType' ? 'options_business_type' : 'options_info_source';
    
    // Load current options
    const optionsRes = await getGlobalOptions();
    const currentList = type === 'businessType' 
      ? optionsRes.data.businessTypes 
      : optionsRes.data.infoSources;

    // Check duplicate case-insensitively
    if (currentList.some(item => item.toLowerCase() === valTrim.toLowerCase())) {
      return { success: false, error: 'Opsi ini sudah ada' };
    }

    const newList = [...currentList, valTrim];
    
    const query = `
      INSERT INTO settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `;
    await pool.query(query, [key, JSON.stringify(newList)]);
    revalidatePath('/');
    return { success: true, data: newList };
  } catch (error) {
    console.error('Error adding global option:', error);
    return { success: false, error: 'Gagal menambahkan opsi baru' };
  }
}

export async function deleteGlobalOption(type: 'businessType' | 'infoSource', value: string) {
  try {
    // Check if any client is currently using this option value
    const checkQuery = type === 'businessType' 
      ? 'SELECT COUNT(*) as count FROM clients WHERE "businessType" = $1'
      : 'SELECT COUNT(*) as count FROM clients WHERE "infoSource" = $1';
      
    const checkRes = await pool.query(checkQuery, [value]);
    const count = parseInt(checkRes.rows[0].count, 10);
    
    if (count > 0) {
      return { 
        success: false, 
        error: `Opsi ini sedang digunakan oleh ${count} data client dan tidak bisa dihapus.` 
      };
    }

    // Load current options
    const key = type === 'businessType' ? 'options_business_type' : 'options_info_source';
    const optionsRes = await getGlobalOptions();
    const currentList = type === 'businessType' 
      ? optionsRes.data.businessTypes 
      : optionsRes.data.infoSources;

    const newList = currentList.filter(item => item !== value);
    
    const query = `
      INSERT INTO settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `;
    await pool.query(query, [key, JSON.stringify(newList)]);
    revalidatePath('/');
    return { success: true, data: newList };
  } catch (error) {
    console.error('Error deleting global option:', error);
    return { success: false, error: 'Gagal menghapus opsi' };
  }
}
