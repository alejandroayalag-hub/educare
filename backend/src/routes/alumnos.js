const router  = require('express').Router();
const pool    = require('../db/pool');
const roles   = require('../middleware/roles');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const fotoDir = path.join(__dirname, '..', '..', 'uploads', 'alumnos');
fs.mkdirSync(fotoDir, { recursive: true });

const storage = multer.diskStorage({
  destination: fotoDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/alumnos?q=&estatus=
router.get('/', async (req, res, next) => {
  try {
    const { q, estatus } = req.query;
    let where = [];
    let params = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(a.nombre ILIKE $${params.length} OR a.apellido_paterno ILIKE $${params.length} OR a.curp ILIKE $${params.length})`);
    }
    if (estatus) {
      params.push(estatus);
      where.push(`a.estatus=$${params.length}`);
    }
    const sql = `
      SELECT a.*,
        (SELECT json_agg(t) FROM tutores t WHERE t.alumno_id = a.id) AS tutores,
        (SELECT json_build_object('grupo_id', i.grupo_id, 'ciclo_id', i.ciclo_id,
                'grupo_nombre', g.nombre, 'grado_nombre', gr.nombre, 'estatus', i.estatus)
         FROM inscripciones i
         JOIN grupos g ON g.id = i.grupo_id
         JOIN grados gr ON gr.id = g.grado_id
         WHERE i.alumno_id = a.id
         ORDER BY i.id DESC LIMIT 1) AS inscripcion_actual
      FROM alumnos a
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.apellido_paterno, a.apellido_materno, a.nombre
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/alumnos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [alumno] } = await pool.query('SELECT * FROM alumnos WHERE id=$1', [req.params.id]);
    if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });

    const { rows: tutores } = await pool.query(
      'SELECT * FROM tutores WHERE alumno_id=$1 ORDER BY es_responsable DESC, id',
      [req.params.id]
    );
    const { rows: inscripciones } = await pool.query(
      `SELECT i.*, g.nombre AS grupo_nombre, gr.nombre AS grado_nombre, ce.nombre AS ciclo_nombre
       FROM inscripciones i
       JOIN grupos g ON g.id = i.grupo_id
       JOIN grados gr ON gr.id = g.grado_id
       JOIN ciclos_escolares ce ON ce.id = i.ciclo_id
       WHERE i.alumno_id=$1 ORDER BY i.id DESC`,
      [req.params.id]
    );
    const { rows: documentos } = await pool.query(
      `SELECT d.*, td.nombre AS tipo_nombre, td.requerido
       FROM documentos_alumno d
       JOIN tipos_documento_alumno td ON td.id = d.tipo_id
       WHERE d.alumno_id=$1`,
      [req.params.id]
    );
    res.json({ ...alumno, tutores, inscripciones, documentos });
  } catch (err) { next(err); }
});

// POST /api/alumnos
router.post('/', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const {
      nombre, apellido_paterno, apellido_materno,
      fecha_nacimiento, curp, sexo, direccion,
      alergias, condiciones_medicas, tipo_sangre, observaciones
    } = req.body;
    if (!nombre || !apellido_paterno || !fecha_nacimiento)
      return res.status(400).json({ error: 'Nombre, apellido paterno y fecha de nacimiento son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO alumnos
        (nombre, apellido_paterno, apellido_materno, fecha_nacimiento, curp, sexo,
         direccion, alergias, condiciones_medicas, tipo_sangre, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [nombre, apellido_paterno, apellido_materno||null, fecha_nacimiento,
       curp||null, sexo||null, direccion||null, alergias||null,
       condiciones_medicas||null, tipo_sangre||null, observaciones||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/alumnos/:id
router.put('/:id', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const {
      nombre, apellido_paterno, apellido_materno,
      fecha_nacimiento, curp, sexo, direccion,
      alergias, condiciones_medicas, tipo_sangre, estatus, observaciones
    } = req.body;
    const { rows } = await pool.query(
      `UPDATE alumnos SET
        nombre=$1, apellido_paterno=$2, apellido_materno=$3,
        fecha_nacimiento=$4, curp=$5, sexo=$6, direccion=$7,
        alergias=$8, condiciones_medicas=$9, tipo_sangre=$10,
        estatus=$11, observaciones=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [nombre, apellido_paterno, apellido_materno||null, fecha_nacimiento,
       curp||null, sexo||null, direccion||null, alergias||null,
       condiciones_medicas||null, tipo_sangre||null, estatus||'activo',
       observaciones||null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Alumno no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/alumnos/:id/foto
router.post('/:id/foto', roles('directora','secretaria'), upload.single('foto'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    const ruta = `/uploads/alumnos/${req.file.filename}`;
    const { rows } = await pool.query(
      'UPDATE alumnos SET foto=$1, updated_at=NOW() WHERE id=$2 RETURNING foto',
      [ruta, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/alumnos/:id
router.delete('/:id', roles('directora'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM alumnos WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
