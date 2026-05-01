const router = require('express').Router();
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');

// GET /api/inscripciones?ciclo_id=&grupo_id=&alumno_id=
router.get('/', async (req, res, next) => {
  try {
    const { ciclo_id, grupo_id, alumno_id } = req.query;
    let where = [];
    let params = [];
    if (ciclo_id)  { params.push(ciclo_id);  where.push(`i.ciclo_id=$${params.length}`); }
    if (grupo_id)  { params.push(grupo_id);  where.push(`i.grupo_id=$${params.length}`); }
    if (alumno_id) { params.push(alumno_id); where.push(`i.alumno_id=$${params.length}`); }
    const { rows } = await pool.query(
      `SELECT i.*, a.nombre AS alumno_nombre, a.apellido_paterno, a.apellido_materno,
              a.foto, g.nombre AS grupo_nombre, gr.nombre AS grado_nombre,
              ce.nombre AS ciclo_nombre
       FROM inscripciones i
       JOIN alumnos a ON a.id = i.alumno_id
       JOIN grupos g ON g.id = i.grupo_id
       JOIN grados gr ON gr.id = g.grado_id
       JOIN ciclos_escolares ce ON ce.id = i.ciclo_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY gr.orden, g.nombre, a.apellido_paterno`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/inscripciones
router.post('/', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { alumno_id, grupo_id, ciclo_id, fecha_inscripcion } = req.body;
    if (!alumno_id || !grupo_id || !ciclo_id)
      return res.status(400).json({ error: 'alumno_id, grupo_id y ciclo_id son requeridos' });

    // verificar capacidad
    const { rows: [grupo] } = await pool.query('SELECT capacidad FROM grupos WHERE id=$1', [grupo_id]);
    const { rows: [{ total }] } = await pool.query(
      'SELECT COUNT(*) AS total FROM inscripciones WHERE grupo_id=$1 AND ciclo_id=$2 AND estatus=\'activo\'',
      [grupo_id, ciclo_id]
    );
    if (parseInt(total) >= grupo.capacidad)
      return res.status(400).json({ error: 'El grupo está al máximo de capacidad' });

    const { rows } = await pool.query(
      `INSERT INTO inscripciones (alumno_id, grupo_id, ciclo_id, fecha_inscripcion)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [alumno_id, grupo_id, ciclo_id, fecha_inscripcion || new Date().toISOString().slice(0,10)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El alumno ya está inscrito en este ciclo' });
    next(err);
  }
});

// PUT /api/inscripciones/:id
router.put('/:id', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { grupo_id, estatus } = req.body;
    const { rows } = await pool.query(
      'UPDATE inscripciones SET grupo_id=$1, estatus=$2 WHERE id=$3 RETURNING *',
      [grupo_id, estatus, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Inscripción no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
