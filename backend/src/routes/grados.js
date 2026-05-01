const router = require('express').Router();
const pool   = require('../db/pool');

// GET /api/grados
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM grados ORDER BY orden');
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
