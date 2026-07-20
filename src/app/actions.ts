'use server';

import { pool, Client, ClientLog, hashPassword, generateSalt } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'crm-super-secret-key-32-chars-long!!';

export interface ClientWithLogs extends Client {
  logs: ClientLog[];
}

// ==========================================
// AUTHENTICATION ACTIONS
// ==========================================

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) return null;

  try {
    const [payloadBase64, signature] = sessionCookie.value.split('.');
    
    // Verify signature
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadBase64).digest('hex');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    return payload as { id: number; username: string; role: 'super_admin' | 'admin' | 'staff' };
  } catch {
    return null;
  }
}

export async function login(usernameInput: string, passwordInput: string) {
  try {
    const username = usernameInput.trim().toLowerCase();
    const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (res.rows.length === 0) {
      return { success: false, error: 'Username atau password salah' };
    }

    const user = res.rows[0];
    const hash = hashPassword(passwordInput, user.salt);
    if (hash !== user.password_hash) {
      return { success: false, error: 'Username atau password salah' };
    }

    // Set signed session cookie
    const payload = { id: user.id, username: user.username, role: user.role };
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadBase64).digest('hex');
    
    const sessionToken = `${payloadBase64}.${signature}`;
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return { success: true, role: user.role };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: 'Terjadi kesalahan sistem' };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return { success: true };
}

// ==========================================
// USER MANAGEMENT ACTIONS (SUPER ADMIN ONLY)
// ==========================================

export async function getUsers() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'super_admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengakses manajemen akun' };
    }

    const res = await pool.query('SELECT id, username, role, "createdAt" FROM users ORDER BY id ASC');
    return { success: true, data: res.rows };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Gagal mengambil data akun pengguna' };
  }
}

export async function createUserAccount(usernameInput: string, passwordInput: string, roleInput: 'admin' | 'staff' | 'super_admin') {
  try {
    const session = await getSession();
    if (!session || session.role !== 'super_admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat membuat akun baru' };
    }

    const username = usernameInput.trim().toLowerCase();
    if (!username || !passwordInput) {
      return { success: false, error: 'Username dan password wajib diisi' };
    }

    // Check duplicate
    const checkRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (checkRes.rows.length > 0) {
      return { success: false, error: 'Username sudah digunakan' };
    }

    const salt = generateSalt();
    const hash = hashPassword(passwordInput, salt);

    await pool.query(
      'INSERT INTO users (username, password_hash, salt, role) VALUES ($1, $2, $3, $4)',
      [username, hash, salt, roleInput]
    );

    return { success: true };
  } catch (error) {
    console.error('Error creating user account:', error);
    return { success: false, error: 'Gagal membuat akun baru' };
  }
}

export async function updateUserAccount(id: number, usernameInput: string, passwordInput: string | null, roleInput: 'admin' | 'staff' | 'super_admin') {
  try {
    const session = await getSession();
    if (!session || session.role !== 'super_admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat mengubah akun' };
    }

    const username = usernameInput.trim().toLowerCase();
    if (!username) {
      return { success: false, error: 'Username tidak boleh kosong' };
    }

    // Check duplicate for other users
    const checkRes = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]);
    if (checkRes.rows.length > 0) {
      return { success: false, error: 'Username sudah digunakan oleh akun lain' };
    }

    if (passwordInput && passwordInput.trim()) {
      const salt = generateSalt();
      const hash = hashPassword(passwordInput, salt);
      await pool.query(
        'UPDATE users SET username = $1, password_hash = $2, salt = $3, role = $4 WHERE id = $5',
        [username, hash, salt, roleInput, id]
      );
    } else {
      await pool.query(
        'UPDATE users SET username = $1, role = $2 WHERE id = $3',
        [username, roleInput, id]
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user account:', error);
    return { success: false, error: 'Gagal memperbarui akun' };
  }
}

export async function deleteUserAccount(id: number) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'super_admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang dapat menghapus akun' };
    }

    if (session.id === id) {
      return { success: false, error: 'Akses Ditolak: Anda tidak dapat menghapus akun Anda sendiri' };
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user account:', error);
    return { success: false, error: 'Gagal menghapus akun' };
  }
}

// ==========================================
// CLIENT LEAD ACTIONS
// ==========================================

export async function getClients(
  search = '', 
  category = '', 
  businessType = '',
  infoSource = '',
  startDate = '',
  endDate = '',
  page = 1, 
  limit = 12
) {
  try {
    // Helper to build WHERE clause
    const buildWhere = (s: string, cat: string, bus: string, info: string, sDate: string, eDate: string) => {
      let where = ' WHERE 1=1';
      const params: (string | number)[] = [];
      let pCount = 1;

      if (s.trim()) {
        where += ` AND (name ILIKE $${pCount} OR "businessName" ILIKE $${pCount + 1} OR phone ILIKE $${pCount + 2} OR address ILIKE $${pCount + 3} OR "businessType" ILIKE $${pCount + 4} OR "infoSource" ILIKE $${pCount + 5})`;
        const searchParam = `%${s.trim()}%`;
        params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
        pCount += 6;
      }

      if (cat && cat !== 'ALL') {
        where += ` AND category = $${pCount}`;
        params.push(cat);
        pCount += 1;
      }

      if (bus && bus !== 'ALL') {
        where += ` AND "businessType" = $${pCount}`;
        params.push(bus);
        pCount += 1;
      }

      if (info && info !== 'ALL') {
        where += ` AND "infoSource" = $${pCount}`;
        params.push(info);
        pCount += 1;
      }

      if (sDate) {
        where += ` AND "createdAt"::date >= $${pCount}::date`;
        params.push(sDate);
        pCount += 1;
      }

      if (eDate) {
        where += ` AND "createdAt"::date <= $${pCount}::date`;
        params.push(eDate);
        pCount += 1;
      }

      return { where, params, nextParamIndex: pCount };
    };

    // 1. Get main client lists matching all active filters
    const { where: mainWhere, params: mainParams, nextParamIndex } = buildWhere(search, category, businessType, infoSource, startDate, endDate);
    
    // Get total count for pagination
    const countRes = await pool.query(`SELECT COUNT(*) as count FROM clients${mainWhere}`, mainParams);
    const total = parseInt(countRes.rows[0].count, 10);

    // Fetch paginated records
    const offset = (page - 1) * limit;
    const paginatedParams = [...mainParams, limit, offset];
    const query = `SELECT * FROM clients${mainWhere} ORDER BY "updatedAt" DESC LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}`;
    
    const res = await pool.query(query, paginatedParams);
    const clients = res.rows as Client[];

    // 2. Fetch facet counts for Categories (ignoring active category filter)
    const { where: catWhere, params: catParams } = buildWhere(search, 'ALL', businessType, infoSource, startDate, endDate);
    const catCountsRes = await pool.query(`SELECT category, COUNT(*) as count FROM clients${catWhere} GROUP BY category`, catParams);
    const catTotalRes = await pool.query(`SELECT COUNT(*) as count FROM clients${catWhere}`, catParams);
    
    const categoryCounts: Record<string, number> = { High: 0, Medium: 0, Low: 0, ALL: parseInt(catTotalRes.rows[0].count, 10) };
    catCountsRes.rows.forEach((row: { category: string; count: string }) => {
      categoryCounts[row.category] = parseInt(row.count, 10);
    });

    // 3. Fetch facet counts for Business Types (ignoring active businessType filter)
    const { where: busWhere, params: busParams } = buildWhere(search, category, 'ALL', infoSource, startDate, endDate);
    const busCountsRes = await pool.query(`SELECT "businessType", COUNT(*) as count FROM clients${busWhere} GROUP BY "businessType"`, busParams);
    const busTotalRes = await pool.query(`SELECT COUNT(*) as count FROM clients${busWhere}`, busParams);
    
    const businessTypeCounts: Record<string, number> = { ALL: parseInt(busTotalRes.rows[0].count, 10) };
    busCountsRes.rows.forEach((row: { businessType: string; count: string }) => {
      businessTypeCounts[row.businessType || 'Tidak Ada'] = parseInt(row.count, 10);
    });

    // 4. Fetch facet counts for Info Sources (ignoring active infoSource filter)
    const { where: infoWhere, params: infoParams } = buildWhere(search, category, businessType, 'ALL', startDate, endDate);
    const infoCountsRes = await pool.query(`SELECT "infoSource", COUNT(*) as count FROM clients${infoWhere} GROUP BY "infoSource"`, infoParams);
    const infoTotalRes = await pool.query(`SELECT COUNT(*) as count FROM clients${infoWhere}`, infoParams);
    
    const infoSourceCounts: Record<string, number> = { ALL: parseInt(infoTotalRes.rows[0].count, 10) };
    infoCountsRes.rows.forEach((row: { infoSource: string; count: string }) => {
      infoSourceCounts[row.infoSource || 'Tidak Ada'] = parseInt(row.count, 10);
    });

    return { 
      success: true, 
      data: {
        clients,
        total,
        page,
        pages: Math.ceil(total / limit),
        facets: {
          categories: categoryCounts,
          businessTypes: businessTypeCounts,
          infoSources: infoSourceCounts
        }
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
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Harus login terlebih dahulu' };
    }

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

    const displayRole = session.role === 'super_admin' ? 'Super Admin' : (session.role === 'admin' ? 'Admin' : 'Staff');
    const creatorName = `${session.username} (${displayRole})`;

    // 1. Write registration audit log
    const auditText = `Mendaftarkan client baru ke dalam sistem.`;
    await dbClient.query(`
      INSERT INTO client_logs ("clientId", "logText", "userId", "createdBy", "createdAt")
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [clientId, auditText, session.id, creatorName]);

    // 2. Write initial details log if provided
    if (initialLog && initialLog.trim()) {
      const logQuery = `
        INSERT INTO client_logs ("clientId", "logText", "userId", "createdBy", "createdAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      await dbClient.query(logQuery, [clientId, initialLog.trim(), session.id, creatorName]);
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
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Harus login terlebih dahulu' };
    }
    if (session.role !== 'admin' && session.role !== 'super_admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Admin atau Super Admin yang dapat mengedit profil client' };
    }

    // Retrieve old data to compare differences for audit logging
    const oldRes = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) {
      return { success: false, error: 'Client tidak ditemukan' };
    }
    const oldClient = oldRes.rows[0];

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
    
    await pool.query(query, params);

    // Audit logs for client update
    const changes: string[] = [];
    if (oldClient.name !== clientData.name) changes.push(`Nama: "${oldClient.name}" ➔ "${clientData.name}"`);
    if (oldClient.phone !== clientData.phone) changes.push(`No HP: "${oldClient.phone}" ➔ "${clientData.phone}"`);
    if (oldClient.businessName !== clientData.businessName) changes.push(`Nama Usaha: "${oldClient.businessName}" ➔ "${clientData.businessName}"`);
    if (oldClient.address !== clientData.address) changes.push(`Alamat: "${oldClient.address}" ➔ "${clientData.address}"`);
    if (oldClient.category !== clientData.category) changes.push(`Potensi: "${oldClient.category}" ➔ "${clientData.category}"`);
    if (oldClient.businessType !== clientData.businessType) changes.push(`Jenis Usaha: "${oldClient.businessType || 'Kosong'}" ➔ "${clientData.businessType || 'Kosong'}"`);
    if (oldClient.infoSource !== clientData.infoSource) changes.push(`Sumber Info: "${oldClient.infoSource || 'Kosong'}" ➔ "${clientData.infoSource || 'Kosong'}"`);

    if (changes.length > 0) {
      const displayRole = session.role === 'super_admin' ? 'Super Admin' : 'Admin';
      const creatorName = `${session.username} (${displayRole})`;
      const auditText = `Mengubah data client: ${changes.join(', ')}`;
      await pool.query(
        'INSERT INTO client_logs ("clientId", "logText", "userId", "createdBy", "createdAt") VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        [id, auditText, session.id, creatorName]
      );
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
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Harus login terlebih dahulu' };
    }
    if (session.role !== 'admin' && session.role !== 'super_admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Admin atau Super Admin yang dapat menghapus data client' };
    }

    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: 'Failed to delete client' };
  }
}

export async function addClientLog(clientId: number, logText: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Harus login terlebih dahulu' };
    }

    const displayRole = session.role === 'super_admin' ? 'Super Admin' : (session.role === 'admin' ? 'Admin' : 'Staff');
    const creatorName = `${session.username} (${displayRole})`;

    const query = `
      INSERT INTO client_logs ("clientId", "logText", "userId", "createdBy", "createdAt")
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;
    await pool.query(query, [clientId, logText.trim(), session.id, creatorName]);
    
    // Touch updated timestamp on client
    await pool.query('UPDATE clients SET "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1', [clientId]);

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error adding client log:', error);
    return { success: false, error: 'Failed to add client log' };
  }
}

// ==========================================
// VARIABLE CONFIG / SETTINGS ACTIONS
// ==========================================

export async function getCustomFields() {
  try {
    const res = await pool.query('SELECT value FROM settings WHERE key = $1', ['custom_fields']);
    if (res.rows.length === 0) {
      return { success: true, data: [] };
    }
    return { success: true, data: JSON.parse(res.rows[0].value) as string[] };
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return { success: false, error: 'Failed to fetch custom fields' };
  }
}

export async function saveCustomFields(fields: string[]) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Harus login terlebih dahulu' };
    }
    if (session.role !== 'admin' && session.role !== 'super_admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Admin atau Super Admin yang dapat mengubah variabel custom' };
    }

    const query = `
      INSERT INTO settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `;
    await pool.query(query, ['custom_fields', JSON.stringify(fields)]);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error saving custom fields:', error);
    return { success: false, error: 'Failed to save custom fields' };
  }
}

export async function getGlobalOptions() {
  try {
    const res = await pool.query("SELECT key, value FROM settings WHERE key IN ('options_business_type', 'options_info_source')");
    
    let businessTypes = ['Corporate', 'Retail', 'UMKM'];
    let infoSources = ['Google', 'Rekomendasi', 'Media Sosial'];

    res.rows.forEach((row: { key: string, value: string }) => {
      if (row.key === 'options_business_type') {
        businessTypes = JSON.parse(row.value);
      } else if (row.key === 'options_info_source') {
        infoSources = JSON.parse(row.value);
      }
    });

    return { success: true, data: { businessTypes, infoSources } };
  } catch (error) {
    console.error('Error loading global options:', error);
    return { success: true, data: { businessTypes: ['Corporate', 'Retail', 'UMKM'], infoSources: ['Google', 'Rekomendasi', 'Media Sosial'] } };
  }
}

export async function addGlobalOption(type: 'businessType' | 'infoSource', value: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Harus login terlebih dahulu' };
    }
    if (session.role !== 'admin' && session.role !== 'super_admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Admin atau Super Admin yang dapat menambah opsi' };
    }

    const valTrim = value.trim();
    if (!valTrim) return { success: false, error: 'Opsi tidak boleh kosong' };

    const key = type === 'businessType' ? 'options_business_type' : 'options_info_source';
    
    const optionsRes = await getGlobalOptions();
    const currentList = type === 'businessType' 
      ? optionsRes.data.businessTypes 
      : optionsRes.data.infoSources;

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
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Harus login terlebih dahulu' };
    }
    if (session.role !== 'admin' && session.role !== 'super_admin') {
      return { success: false, error: 'Akses Ditolak: Hanya Admin atau Super Admin yang dapat menghapus opsi' };
    }

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
