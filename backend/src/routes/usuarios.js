const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');

// GET /api/usuarios
router.get('/', roles('directora'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/usuarios
router.post('/', roles('directora'), async (req, res, next) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol)
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol)
       VALUES ($1,$2,$3,$4) RETURNING id, nombre, email, rol, activo, created_at`,
      [nombre, email, hash, rol]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    next(err);
  }
});

// PUT /api/usuarios/:id
router.put('/:id', roles('directora'), async (req, res, next) => {
  try {
    const { nombre, email, rol, activo, password } = req.body;
    let query, params;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query = `UPDATE usuarios SET nombre=$1, email=$2, rol=$3, activo=$4, password=$5, updated_at=NOW()
               WHERE id=$6 RETURNING id, nombre, email, rol, activo`;
      params = [nombre, email, rol, activo, hash, req.params.id];
    } else {
      query = `UPDATE usuarios SET nombre=$1, email=$2, rol=$3, activo=$4, updated_at=NOW()
               WHERE id=$5 RETURNING id, nombre, email, rol, activo`;
      params = [nombre, email, rol, activo, req.params.id];
    }
    const { rows } = await pool.query(query, params);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/usuarios/:id
router.delete('/:id', roles('directora'), async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    await pool.query('DELETE FROM usuarios WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
