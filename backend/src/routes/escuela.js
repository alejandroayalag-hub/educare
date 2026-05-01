const router = require('express').Router();
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'escuela');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `logo${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/escuela
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM escuela LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) { next(err); }
});

// PUT /api/escuela
router.put('/', roles('directora'), async (req, res, next) => {
  try {
    const { nombre, slogan, direccion, telefono, email, rfc, color_primario } = req.body;
    const { rows } = await pool.query(
      `UPDATE escuela SET nombre=$1, slogan=$2, direccion=$3, telefono=$4,
       email=$5, rfc=$6, color_primario=$7, updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [nombre, slogan, direccion, telefono, email, rfc, color_primario]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/escuela/logo
router.post('/logo', roles('directora'), upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
    const ruta = req.file.path;
    const { rows } = await pool.query(
      'UPDATE escuela SET logo_ruta=$1, updated_at=NOW() WHERE id=1 RETURNING *', [ruta]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
