const router  = require('express').Router();
const pool    = require('../db/pool');
const roles   = require('../middleware/roles');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const docsDir = path.join(__dirname, '..', '..', 'uploads', 'documentos-alumnos');
fs.mkdirSync(docsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: docsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET /api/documentos-alumnos/tipos
router.get('/tipos', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tipos_documento_alumno ORDER BY id');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/documentos-alumnos?alumno_id=
router.get('/', async (req, res, next) => {
  try {
    const { alumno_id } = req.query;
    if (!alumno_id) return res.status(400).json({ error: 'alumno_id requerido' });
    const { rows } = await pool.query(
      `SELECT d.*, td.nombre AS tipo_nombre, td.requerido
       FROM documentos_alumno d
       JOIN tipos_documento_alumno td ON td.id = d.tipo_id
       WHERE d.alumno_id=$1
       ORDER BY td.id`,
      [alumno_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/documentos-alumnos (multipart)
router.post('/', roles('directora','secretaria'), upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    const { alumno_id, tipo_id } = req.body;
    if (!alumno_id || !tipo_id) return res.status(400).json({ error: 'alumno_id y tipo_id requeridos' });
    const ruta = `/uploads/documentos-alumnos/${req.file.filename}`;
    const { rows } = await pool.query(
      `INSERT INTO documentos_alumno (alumno_id, tipo_id, filename, ruta, estatus)
       VALUES ($1,$2,$3,$4,'completo')
       ON CONFLICT (alumno_id, tipo_id) DO UPDATE
         SET filename=EXCLUDED.filename, ruta=EXCLUDED.ruta,
             estatus='completo', updated_at=NOW()
       RETURNING *`,
      [alumno_id, tipo_id, req.file.originalname, ruta]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/documentos-alumnos/:id
router.delete('/:id', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { rows: [doc] } = await pool.query('SELECT ruta FROM documentos_alumno WHERE id=$1', [req.params.id]);
    if (doc) {
      const file = path.join(__dirname, '..', '..', doc.ruta.replace(/^\//, ''));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    await pool.query('DELETE FROM documentos_alumno WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
