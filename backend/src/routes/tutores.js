const router = require('express').Router();
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');

// GET /api/tutores?alumno_id=
router.get('/', async (req, res, next) => {
  try {
    const { alumno_id } = req.query;
    if (!alumno_id) return res.status(400).json({ error: 'alumno_id requerido' });
    const { rows } = await pool.query(
      'SELECT * FROM tutores WHERE alumno_id=$1 ORDER BY es_responsable DESC, id',
      [alumno_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/tutores
router.post('/', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { alumno_id, nombre, parentesco, telefono, telefono_trabajo,
            email, ocupacion, es_responsable } = req.body;
    if (!alumno_id || !nombre) return res.status(400).json({ error: 'alumno_id y nombre son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO tutores (alumno_id, nombre, parentesco, telefono, telefono_trabajo, email, ocupacion, es_responsable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [alumno_id, nombre, parentesco||'madre', telefono||null, telefono_trabajo||null,
       email||null, ocupacion||null, es_responsable||false]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/tutores/:id
router.put('/:id', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { nombre, parentesco, telefono, telefono_trabajo,
            email, ocupacion, es_responsable } = req.body;
    const { rows } = await pool.query(
      `UPDATE tutores SET nombre=$1, parentesco=$2, telefono=$3, telefono_trabajo=$4,
       email=$5, ocupacion=$6, es_responsable=$7 WHERE id=$8 RETURNING *`,
      [nombre, parentesco, telefono||null, telefono_trabajo||null,
       email||null, ocupacion||null, es_responsable||false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tutor no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/tutores/:id
router.delete('/:id', roles('directora','secretaria'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM tutores WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
