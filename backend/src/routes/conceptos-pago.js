const router = require('express').Router();
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');

// GET /api/conceptos-pago
router.get('/', async (req, res, next) => {
  try {
    const { activo } = req.query;
    let sql = 'SELECT * FROM conceptos_pago';
    const params = [];
    if (activo !== undefined) {
      params.push(activo === 'true');
      sql += ` WHERE activo=$1`;
    }
    sql += ' ORDER BY tipo, nombre';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/conceptos-pago
router.post('/', roles('directora'), async (req, res, next) => {
  try {
    const { nombre, descripcion, monto, tipo } = req.body;
    if (!nombre || monto === undefined) return res.status(400).json({ error: 'nombre y monto son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO conceptos_pago (nombre, descripcion, monto, tipo)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [nombre, descripcion||null, monto, tipo||'mensualidad']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/conceptos-pago/:id
router.put('/:id', roles('directora'), async (req, res, next) => {
  try {
    const { nombre, descripcion, monto, tipo, activo } = req.body;
    const { rows } = await pool.query(
      `UPDATE conceptos_pago SET nombre=$1, descripcion=$2, monto=$3, tipo=$4, activo=$5
       WHERE id=$6 RETURNING *`,
      [nombre, descripcion||null, monto, tipo, activo !== undefined ? activo : true, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Concepto no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/conceptos-pago/:id
router.delete('/:id', roles('directora'), async (req, res, next) => {
  try {
    await pool.query('UPDATE conceptos_pago SET activo=false WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
