require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const pool   = require('../src/db/pool');

async function main() {
  const email    = process.env.ADMIN_EMAIL    || 'admin@gokids.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol)
     VALUES ($1,$2,$3,'directora') ON CONFLICT (email) DO NOTHING`,
    ['Directora', email, hash]
  );
  console.log(`Admin creado: ${email} / ${password}`);
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
