const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');
const pool   = require('./pool');

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const dir   = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE filename=$1', [file]);
    if (rows.length) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    console.log(`Migración aplicada: ${file}`);
  }

  // Crear usuario admin si no existe
  const { rows: admins } = await pool.query("SELECT 1 FROM usuarios WHERE email=$1", [process.env.ADMIN_EMAIL]);
  if (!admins.length && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await pool.query(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES ('Administrador', $1, $2, 'directora')",
      [process.env.ADMIN_EMAIL, hash]
    );
    console.log(`Usuario admin creado: ${process.env.ADMIN_EMAIL}`);
  }
}

module.exports = runMigrations;
