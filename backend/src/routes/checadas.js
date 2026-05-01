const router = require('express').Router();
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');
const auth   = require('../middleware/auth');

// Middleware de API key para agentes físicos
const apiKeyAuth = async (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'API key requerida' });
  const { rows: [dev] } = await pool.query(
    'SELECT * FROM checador_dispositivos WHERE api_key=$1 AND activo=true', [key]
  );
  if (!dev) return res.status(403).json({ error: 'API key inválida' });
  req.dispositivo = dev;
  next();
};

// POST /api/checadas/sync — agente físico sincroniza registros
router.post('/sync', apiKeyAuth, async (req, res, next) => {
  try {
    const { registros } = req.body;
    if (!Array.isArray(registros)) return res.status(400).json({ error: 'registros debe ser array' });

    let insertados = 0;
    for (const r of registros) {
      const { rows: [map] } = await pool.query(
        'SELECT empleado_id FROM checador_empleados WHERE dispositivo_id=$1 AND uid_checador=$2',
        [req.dispositivo.id, r.uid]
      );
      if (!map) continue;
      try {
        await pool.query(
          `INSERT INTO checadas (empleado_id, dispositivo_id, timestamp, tipo, uid_checador)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [map.empleado_id, req.dispositivo.id, new Date(r.timestamp), r.tipo || 'entrada', r.uid]
        );
        insertados++;
      } catch { /* duplicado, ignorar */ }
    }
    res.json({ insertados, total: registros.length });
  } catch (err) { next(err); }
});

// GET /api/checadas/sync/mappings — agente obtiene mapa UID→empleado
router.get('/sync/mappings', apiKeyAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT uid_checador, empleado_id FROM checador_empleados WHERE dispositivo_id=$1',
      [req.dispositivo.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Rutas del panel (requieren JWT) ──────────────────────────────

// GET /api/checadas/dispositivos
router.get('/dispositivos', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM checador_dispositivos ORDER BY nombre');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/checadas/dispositivos
router.post('/dispositivos', auth, roles('directora'), async (req, res, next) => {
  try {
    const { nombre, ubicacion, ip } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });
    const { rows } = await pool.query(
      `INSERT INTO checador_dispositivos (nombre, ubicacion, ip)
       VALUES ($1,$2,$3) RETURNING *`,
      [nombre, ubicacion||null, ip||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/checadas/mappings
router.get('/mappings', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT cm.*, e.nombre, e.apellido_paterno, d.nombre AS dispositivo_nombre
       FROM checador_empleados cm
       JOIN empleados e ON e.id = cm.empleado_id
       JOIN checador_dispositivos d ON d.id = cm.dispositivo_id
       ORDER BY d.nombre, e.apellido_paterno`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/checadas/mappings
router.post('/mappings', auth, roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { empleado_id, dispositivo_id, uid_checador } = req.body;
    if (!empleado_id || !dispositivo_id || uid_checador === undefined)
      return res.status(400).json({ error: 'empleado_id, dispositivo_id y uid_checador son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO checador_empleados (empleado_id, dispositivo_id, uid_checador)
       VALUES ($1,$2,$3)
       ON CONFLICT (dispositivo_id, uid_checador) DO UPDATE SET empleado_id=EXCLUDED.empleado_id
       RETURNING *`,
      [empleado_id, dispositivo_id, uid_checador]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/checadas/mappings/:id
router.delete('/mappings/:id', auth, roles('directora'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM checador_empleados WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

// GET /api/checadas/empleado/:id?desde=&hasta=
router.get('/empleado/:id', auth, async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;
    const params = [req.params.id];
    let extra = '';
    if (desde) { params.push(desde); extra += ` AND c.timestamp >= $${params.length}`; }
    if (hasta) { params.push(hasta); extra += ` AND c.timestamp <= $${params.length}::date + interval '1 day'`; }
    const { rows } = await pool.query(
      `SELECT c.*, d.nombre AS dispositivo_nombre
       FROM checadas c
       JOIN checador_dispositivos d ON d.id = c.dispositivo_id
       WHERE c.empleado_id=$1 ${extra}
       ORDER BY c.timestamp DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
