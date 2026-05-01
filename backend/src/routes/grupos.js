const router = require('express').Router();
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');

// GET /api/grupos?ciclo_id=
router.get('/', async (req, res, next) => {
  try {
    const { ciclo_id } = req.query;
    const base = `
      SELECT g.*, gr.nombre AS grado_nombre, gr.orden AS grado_orden,
             u.nombre AS maestro_nombre,
             (SELECT COUNT(*) FROM inscripciones i WHERE i.grupo_id = g.id AND i.ciclo_id = g.ciclo_id AND i.estatus='activo') AS inscritos
      FROM grupos g
      JOIN grados gr ON gr.id = g.grado_id
      LEFT JOIN usuarios u ON u.id = g.maestro_id
    `;
    let q, params;
    if (ciclo_id) {
      q = base + ' WHERE g.ciclo_id=$1 ORDER BY gr.orden, g.nombre';
      params = [ciclo_id];
    } else {
      q = base + ' ORDER BY gr.orden, g.nombre';
      params = [];
    }
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/grupos
router.post('/', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { nombre, grado_id, ciclo_id, maestro_id, capacidad } = req.body;
    if (!nombre || !grado_id || !ciclo_id)
      return res.status(400).json({ error: 'nombre, grado_id y ciclo_id son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO grupos (nombre, grado_id, ciclo_id, maestro_id, capacidad)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre, grado_id, ciclo_id, maestro_id || null, capacidad || 20]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/grupos/:id
router.put('/:id', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { nombre, grado_id, maestro_id, capacidad } = req.body;
    const { rows } = await pool.query(
      `UPDATE grupos SET nombre=$1, grado_id=$2, maestro_id=$3, capacidad=$4
       WHERE id=$5 RETURNING *`,
      [nombre, grado_id, maestro_id || null, capacidad, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Grupo no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/grupos/:id
router.delete('/:id', roles('directora'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM grupos WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
