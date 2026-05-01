const router  = require('express').Router();
const pool    = require('../db/pool');
const roles   = require('../middleware/roles');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const fotoDir = path.join(__dirname, '..', '..', 'uploads', 'empleados');
fs.mkdirSync(fotoDir, { recursive: true });

const storage = multer.diskStorage({
  destination: fotoDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/empleados?q=&estatus=
router.get('/', async (req, res, next) => {
  try {
    const { q, estatus } = req.query;
    let where = []; const params = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(nombre ILIKE $${params.length} OR apellido_paterno ILIKE $${params.length} OR curp ILIKE $${params.length})`);
    }
    if (estatus) { params.push(estatus); where.push(`estatus=$${params.length}`); }
    const { rows } = await pool.query(
      `SELECT * FROM empleados ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY apellido_paterno, nombre`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/empleados/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [e] } = await pool.query('SELECT * FROM empleados WHERE id=$1', [req.params.id]);
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(e);
  } catch (err) { next(err); }
});

// POST /api/empleados
router.post('/', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const {
      nombre, apellido_paterno, apellido_materno, curp, rfc,
      fecha_nacimiento, fecha_ingreso, puesto, departamento,
      telefono, email, direccion, nombre_beneficiario,
      contacto_emergencia_nombre, contacto_emergencia_telefono, observaciones
    } = req.body;
    if (!nombre || !apellido_paterno) return res.status(400).json({ error: 'Nombre y apellido paterno son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO empleados (nombre, apellido_paterno, apellido_materno, curp, rfc,
         fecha_nacimiento, fecha_ingreso, puesto, departamento, telefono, email,
         direccion, nombre_beneficiario, contacto_emergencia_nombre, contacto_emergencia_telefono, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [nombre, apellido_paterno, apellido_materno||null, curp||null, rfc||null,
       fecha_nacimiento||null, fecha_ingreso||new Date().toISOString().slice(0,10),
       puesto||null, departamento||null, telefono||null, email||null,
       direccion||null, nombre_beneficiario||null,
       contacto_emergencia_nombre||null, contacto_emergencia_telefono||null, observaciones||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/empleados/:id
router.put('/:id', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const {
      nombre, apellido_paterno, apellido_materno, curp, rfc,
      fecha_nacimiento, fecha_ingreso, puesto, departamento,
      telefono, email, direccion, nombre_beneficiario,
      contacto_emergencia_nombre, contacto_emergencia_telefono, observaciones, estatus
    } = req.body;
    const { rows } = await pool.query(
      `UPDATE empleados SET nombre=$1, apellido_paterno=$2, apellido_materno=$3, curp=$4, rfc=$5,
         fecha_nacimiento=$6, fecha_ingreso=$7, puesto=$8, departamento=$9, telefono=$10,
         email=$11, direccion=$12, nombre_beneficiario=$13,
         contacto_emergencia_nombre=$14, contacto_emergencia_telefono=$15,
         observaciones=$16, estatus=$17, updated_at=NOW()
       WHERE id=$18 RETURNING *`,
      [nombre, apellido_paterno, apellido_materno||null, curp||null, rfc||null,
       fecha_nacimiento||null, fecha_ingreso, puesto||null, departamento||null, telefono||null,
       email||null, direccion||null, nombre_beneficiario||null,
       contacto_emergencia_nombre||null, contacto_emergencia_telefono||null,
       observaciones||null, estatus||'activo', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/empleados/:id/foto
router.post('/:id/foto', roles('directora','secretaria'), upload.single('foto'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
    const ruta = `/uploads/empleados/${req.file.filename}`;
    const { rows } = await pool.query(
      'UPDATE empleados SET foto=$1, updated_at=NOW() WHERE id=$2 RETURNING foto',
      [ruta, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/empleados/:id
router.delete('/:id', roles('directora'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM empleados WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
