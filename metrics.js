import io from '@pm2/io'; // Impor default
import { readFile } from 'fs/promises';

// Inisialisasi PM2
io.init({
  transactions: true,
  http: true
});

// Gunakan io.metric() untuk membuat metric
const registeredUsersMetric = io.metric({ 
  name: 'Registered Users',
  id: 'app/users/registered' // Optional, tapi direkomendasikan
});

setInterval(async () => {
  try {
    const raw = await readFile('./database.json', 'utf-8');
    const db = JSON.parse(raw);
    const users = db.users || {};

    const registeredCount = Object.values(users)
      .filter(u => u.registered)
      .length;

    registeredUsersMetric.set(registeredCount);
  } catch (err) {
    console.error('Gagal membaca database:', err);
    registeredUsersMetric.set(0);
  }
}, 5000);