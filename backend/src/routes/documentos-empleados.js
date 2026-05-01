const router  = require('express').Router();
const pool    = require('../db/pool');
const roles   = require('../middleware/roles');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const docsDir = path.join(__dirname, '..', '..', 'uploads', 'documentos-empleados');
fs.mkdirSync(docsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: docsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET /api/documentos-empleados/tipos
router.get('/tipos', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tipos_documento_empleado ORDER BY requerido DESC, nombre');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/documentos-empleados?empleado_id=
router.get('/', async (req, res, next) => {
  try {
    const { empleado_id } = req.query;
    if (!empleado_id) return res.status(400).json({ error: 'empleado_id requerido' });
    const { rows } = await pool.query(
      `SELECT d.*, t.nombre AS tipo_nombre, t.requerido
       FROM documentos_empleado d
       JOIN tipos_documento_empleado t ON t.id = d.tipo_documento_id
       WHERE d.empleado_id=$1 ORDER BY t.requerido DESC, t.nombre`,
      [empleado_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/documentos-empleados (multipart)
router.post('/', roles('directora','secretaria'), upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    const { empleado_id, tipo_documento_id } = req.body;
    if (!empleado_id || !tipo_documento_id) return res.status(400).json({ error: 'empleado_id y tipo_documento_id son requeridos' });
    const ruta = `/uploads/documentos-empleados/${req.file.filename}`;
    const { rows } = await pool.query(
      `INSERT INTO documentos_empleado (empleado_id, tipo_documento_id, filename, ruta, estatus)
       VALUES ($1,$2,$3,$4,'completo')
       ON CONFLICT (empleado_id, tipo_documento_id) DO UPDATE
         SET filename=EXCLUDED.filename, ruta=EXCLUDED.ruta, estatus='completo', updated_at=NOW()
       RETURNING *`,
      [empleado_id, tipo_documento_id, req.file.originalname, ruta]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/documentos-empleados/:id/download
router.get('/:id/download', async (req, res, next) => {
  try {
    const { rows: [doc] } = await pool.query('SELECT * FROM documentos_empleado WHERE id=$1', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    const file = path.join(__dirname, '..', '..', doc.ruta.replace(/^\//, ''));
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Archivo no encontrado en servidor' });
    res.download(file, doc.filename);
  } catch (err) { next(err); }
});

// DELETE /api/documentos-empleados/:id
router.delete('/:id', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { rows: [doc] } = await pool.query('SELECT ruta FROM documentos_empleado WHERE id=$1', [req.params.id]);
    if (doc) {
      const file = path.join(__dirname, '..', '..', doc.ruta.replace(/^\//, ''));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    await pool.query('DELETE FROM documentos_empleado WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
