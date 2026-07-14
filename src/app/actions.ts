'use server';

import { db, Client, ClientLog } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface ClientWithLogs extends Client {
  logs: ClientLog[];
}

export async function getClients(search = '', category = '') {
  try {
    let query = 'SELECT * FROM clients WHERE 1=1';
    const params: (string | number)[] = [];

    if (search.trim()) {
      query += ' AND (name LIKE ? OR businessName LIKE ? OR phone LIKE ? OR address LIKE ?)';
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (category && category !== 'ALL') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY updatedAt DESC';

    const stmt = db.prepare(query);
    const clients = stmt.all(...params) as Client[];
    return { success: true, data: clients };
  } catch (error) {
    console.error('Error fetching clients:', error);
    return { success: false, error: 'Failed to fetch clients' };
  }
}

export async function getClientWithLogs(id: number) {
  try {
    const clientStmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    const client = clientStmt.get(id) as Client | undefined;

    if (!client) {
      return { success: false, error: 'Client not found' };
    }

    const logsStmt = db.prepare('SELECT * FROM client_logs WHERE clientId = ? ORDER BY createdAt DESC');
    const logs = logsStmt.all(id) as ClientLog[];

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
  try {
    const transaction = db.transaction(() => {
      const clientStmt = db.prepare(`
        INSERT INTO clients (name, phone, businessName, address, category, customValues, createdAt, updatedAt)
        VALUES (@name, @phone, @businessName, @address, @category, @customValues, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      const result = clientStmt.run({
        ...clientData,
        customValues: clientData.customValues || '{}'
      });
      const clientId = result.lastInsertRowid as number;

      if (initialLog && initialLog.trim()) {
        const logStmt = db.prepare(`
          INSERT INTO client_logs (clientId, logText, createdAt)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `);
        logStmt.run(clientId, initialLog.trim());
      }

      return clientId;
    });

    const clientId = transaction();
    revalidatePath('/');
    return { success: true, data: { id: clientId } };
  } catch (error) {
    console.error('Error creating client:', error);
    return { success: false, error: 'Failed to create client' };
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
    const stmt = db.prepare(`
      UPDATE clients
      SET name = @name, phone = @phone, businessName = @businessName, address = @address, category = @category, customValues = @customValues, updatedAt = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    
    const result = stmt.run({ ...clientData, customValues: clientData.customValues || '{}', id });
    
    if (result.changes === 0) {
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
    const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
    stmt.run(id);
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: 'Failed to delete client' };
  }
}

export async function addClientLog(clientId: number, logText: string) {
  try {
    const transaction = db.transaction(() => {
      const logStmt = db.prepare(`
        INSERT INTO client_logs (clientId, logText, createdAt)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      logStmt.run(clientId, logText.trim());

      const updateClientStmt = db.prepare(`
        UPDATE clients SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?
      `);
      updateClientStmt.run(clientId);
    });

    transaction();
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error adding log:', error);
    return { success: false, error: 'Failed to add log' };
  }
}
export async function getCustomFields() {
  try {
    const stmt = db.prepare("SELECT value FROM settings WHERE key = 'custom_fields'");
    const row = stmt.get() as { value: string } | undefined;
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
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES ('custom_fields', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(JSON.stringify(fields));
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error saving custom fields:', error);
    return { success: false, error: 'Failed to save custom fields' };
  }
}
