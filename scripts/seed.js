const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../clients.db');
const db = new Database(dbPath);

const dummyClients = [
  { 
    name: 'Budi Santoso', 
    phone: '081234567890', 
    businessName: 'Kopi Kenangan Senja', 
    address: 'Jl. Sudirman No. 12, Jakarta', 
    category: 'High', 
    logs: [
      'Tertarik buat aplikasi kasir (POS) terintegrasi QRIS.',
      'Sudah dikirimi proposal penawaran, masih nego harga.'
    ] 
  },
  { 
    name: 'Siti Rahma', 
    phone: '085711223344', 
    businessName: 'Hijab Chic Bandung', 
    address: 'Jl. Riau No. 45, Bandung', 
    category: 'Medium', 
    logs: [
      'Tanya-tanya website katalog e-commerce.',
      'Minta follow up setelah gajian/awal bulan.'
    ] 
  },
  { 
    name: 'Hendra Wijaya', 
    phone: '081988776655', 
    businessName: 'PT Logistik Maju', 
    address: 'Kawasan Industri Cikarang Blok B', 
    category: 'High', 
    logs: [
      'Butuh dashboard tracking armada kurir real-time.',
      'Meeting pertama lancar, minggu depan demo prototype.'
    ] 
  },
  { 
    name: 'Dewi Lestari', 
    phone: '082155667788', 
    businessName: 'Catering Ibu Dewi', 
    address: 'Jl. Melati No. 8, Surabaya', 
    category: 'Low', 
    logs: [
      'Pengen buat web profile catering sederhana.',
      'Budget minim, di bawah 5 juta. Hold dulu.'
    ] 
  },
  { 
    name: 'Rian Hidayat', 
    phone: '081399001122', 
    businessName: 'Gym Fit Brotherhood', 
    address: 'Ruko Golden Boulevard No. 3, Tangerang', 
    category: 'Medium', 
    logs: [
      'Butuh sistem booking member via aplikasi web.',
      'Menawarkan diskon jika dibayar lunas di depan.'
    ] 
  },
  { 
    name: 'Andi Pratama', 
    phone: '081299887766', 
    businessName: 'Cahaya Motor', 
    address: 'Jl. Gajah Mada No. 100, Semarang', 
    category: 'Low', 
    logs: [
      'Ingin integrasi sistem stok gudang.',
      'Masih membandingkan dengan vendor lain.'
    ] 
  }
];

const insertClient = db.prepare(`
  INSERT INTO clients (name, phone, businessName, address, category, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
`);

const insertLog = db.prepare(`
  INSERT INTO client_logs (clientId, logText, createdAt)
  VALUES (?, ?, datetime('now', 'localtime'))
`);

const transaction = db.transaction(() => {
  for (const client of dummyClients) {
    const res = insertClient.run(client.name, client.phone, client.businessName, client.address, client.category);
    const clientId = res.lastInsertRowid;
    for (const log of client.logs) {
      insertLog.run(clientId, log);
    }
  }
});

try {
  transaction();
  console.log('Database successfully seeded with 6 dummy clients and logs!');
} catch (err) {
  console.error('Failed to seed database:', err);
} finally {
  db.close();
}
