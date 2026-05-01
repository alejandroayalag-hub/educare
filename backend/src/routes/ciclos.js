const router = require('express').Router();
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');

// GET /api/ciclos
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ciclos_escolares ORDER BY fecha_inicio DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/ciclos
router.post('/', roles('directora'), async (req, res, next) => {
  try {
    const { nombre, fecha_inicio, fecha_fin } = req.body;
    if (!nombre || !fecha_inicio || !fecha_fin)
      return res.status(400).json({ error: 'Nombre, fecha inicio y fecha fin son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO ciclos_escolares (nombre, fecha_inicio, fecha_fin)
       VALUES ($1,$2,$3) RETURNING *`,
      [nombre, fecha_inicio, fecha_fin]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/ciclos/:id/activar
router.put('/:id/activar', roles('directora'), async (req, res, next) => {
  try {
    await pool.query('UPDATE ciclos_escolares SET activo=false');
    const { rows } = await pool.query(
      'UPDATE ciclos_escolares SET activo=true WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ciclo no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/ciclos/:id
router.delete('/:id', roles('directora'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM ciclos_escolares WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
