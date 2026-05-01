const router      = require('express').Router();
const pool        = require('../db/pool');
const roles       = require('../middleware/roles');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
});

// GET /api/pagos?alumno_id=&fecha_inicio=&fecha_fin=
router.get('/', async (req, res, next) => {
  try {
    const { alumno_id, fecha_inicio, fecha_fin } = req.query;
    let where = []; const params = [];
    if (alumno_id)    { params.push(alumno_id);    where.push(`p.alumno_id=$${params.length}`); }
    if (fecha_inicio) { params.push(fecha_inicio); where.push(`p.fecha_pago >= $${params.length}`); }
    if (fecha_fin)    { params.push(fecha_fin);    where.push(`p.fecha_pago <= $${params.length}::date + interval '1 day'`); }
    const { rows } = await pool.query(
      `SELECT p.*, a.nombre AS alumno_nombre, a.apellido_paterno,
              u.nombre AS cajero_nombre,
              c.descripcion AS cargo_descripcion
       FROM pagos p
       JOIN alumnos a ON a.id = p.alumno_id
       LEFT JOIN usuarios u ON u.id = p.usuario_id
       LEFT JOIN cargos c ON c.id = p.cargo_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY p.fecha_pago DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/pagos — pago en efectivo o transferencia
router.post('/', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { alumno_id, cargo_id, monto, metodo, referencia, notas } = req.body;
    if (!alumno_id || !monto) return res.status(400).json({ error: 'alumno_id y monto son requeridos' });
    if (metodo === 'tarjeta') return res.status(400).json({ error: 'Para pagos con tarjeta usa /api/pagos/mp/preferencia' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO pagos (alumno_id, cargo_id, monto, metodo, referencia, notas, usuario_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [alumno_id, cargo_id||null, monto, metodo||'efectivo', referencia||null, notas||null, req.user.id]
      );
      if (cargo_id) {
        await client.query(`UPDATE cargos SET estatus='pagado', updated_at=NOW() WHERE id=$1`, [cargo_id]);
      }
      await client.query('COMMIT');
      res.status(201).json(rows[0]);
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { next(err); }
});

// POST /api/pagos/mp/preferencia — crea preferencia MercadoPago
router.post('/mp/preferencia', roles('directora','secretaria'), async (req, res, next) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN)
      return res.status(503).json({ error: 'MercadoPago no está configurado. Agrega MP_ACCESS_TOKEN en el .env' });

    const { alumno_id, cargo_id, monto, descripcion } = req.body;
    if (!alumno_id || !monto) return res.status(400).json({ error: 'alumno_id y monto son requeridos' });

    const { rows: [alumno] } = await pool.query(
      'SELECT nombre, apellido_paterno FROM alumnos WHERE id=$1', [alumno_id]
    );

    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: [{
          id: cargo_id ? String(cargo_id) : `alumno-${alumno_id}`,
          title: descripcion || `Pago escolar — ${alumno.nombre} ${alumno.apellido_paterno}`,
          quantity: 1,
          unit_price: parseFloat(monto),
          currency_id: 'MXN',
        }],
        back_urls: {
          success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cobranza/pago-exitoso`,
          failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cobranza/pago-fallido`,
          pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cobranza/pago-pendiente`,
        },
        notification_url: `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/pagos/mp/webhook`,
        metadata: { alumno_id, cargo_id: cargo_id || null, usuario_id: req.user.id },
        auto_return: 'approved',
      }
    });

    // Registrar pago pendiente en DB
    await pool.query(
      `INSERT INTO pagos (alumno_id, cargo_id, monto, metodo, mp_preference_id, mp_status, notas, usuario_id)
       VALUES ($1,$2,$3,'tarjeta',$4,'pending',$5,$6)`,
      [alumno_id, cargo_id||null, monto, result.id,
       descripcion||null, req.user.id]
    );

    res.json({ preference_id: result.id, init_point: result.init_point, sandbox_init_point: result.sandbox_init_point });
  } catch (err) { next(err); }
});

// Handler exportado por separado para registrarlo sin auth en index.js
const webhookMP = async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment' && data?.id && process.env.MP_ACCESS_TOKEN) {
      const payment = new Payment(mpClient);
      const info = await payment.get({ id: data.id });
      const { rows: [pago] } = await pool.query(
        'SELECT * FROM pagos WHERE mp_preference_id=$1 ORDER BY id DESC LIMIT 1',
        [info.preference_id]
      );
      if (pago) {
        await pool.query(
          `UPDATE pagos SET mp_payment_id=$1, mp_status=$2 WHERE id=$3`,
          [String(data.id), info.status, pago.id]
        );
        if (info.status === 'approved' && pago.cargo_id) {
          await pool.query(`UPDATE cargos SET estatus='pagado', updated_at=NOW() WHERE id=$1`, [pago.cargo_id]);
        }
      }
    }
    res.sendStatus(200);
  } catch { res.sendStatus(200); }
};
router.post('/mp/webhook', webhookMP);

// GET /api/pagos/resumen-dia?fecha=
router.get('/resumen-dia', roles('directora','secretaria','contador'), async (req, res, next) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0,10);
    const { rows } = await pool.query(
      `SELECT
         metodo,
         COUNT(*) AS num_pagos,
         SUM(monto) AS total
       FROM pagos
       WHERE fecha_pago::date = $1
       GROUP BY metodo`,
      [fecha]
    );
    const totales = { efectivo: 0, tarjeta: 0, transferencia: 0, num_pagos: 0, total: 0 };
    rows.forEach(r => {
      totales[r.metodo] = parseFloat(r.total);
      totales.num_pagos += parseInt(r.num_pagos);
      totales.total += parseFloat(r.total);
    });
    res.json({ fecha, ...totales });
  } catch (err) { next(err); }
});

// POST /api/pagos/corte — genera corte de caja del día
router.post('/corte', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const fecha = req.body.fecha || new Date().toISOString().slice(0,10);
    const { rows } = await pool.query(
      `SELECT metodo, COUNT(*) AS num, SUM(monto) AS total FROM pagos WHERE fecha_pago::date=$1 GROUP BY metodo`,
      [fecha]
    );
    let efectivo = 0, tarjeta = 0, transferencia = 0, num_pagos = 0;
    rows.forEach(r => {
      if (r.metodo === 'efectivo')      efectivo     = parseFloat(r.total);
      if (r.metodo === 'tarjeta')       tarjeta      = parseFloat(r.total);
      if (r.metodo === 'transferencia') transferencia = parseFloat(r.total);
      num_pagos += parseInt(r.num);
    });
    const total = efectivo + tarjeta + transferencia;
    const { rows: [corte] } = await pool.query(
      `INSERT INTO cortes_caja (usuario_id, fecha, total_efectivo, total_tarjeta, total_transferencia, total, num_pagos, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (fecha) DO UPDATE SET
         total_efectivo=$3, total_tarjeta=$4, total_transferencia=$5, total=$6, num_pagos=$7, notas=$8
       RETURNING *`,
      [req.user.id, fecha, efectivo, tarjeta, transferencia, total, num_pagos, req.body.notas||null]
    );
    res.json(corte);
  } catch (err) { next(err); }
});

// GET /api/pagos/cortes
router.get('/cortes', roles('directora','secretaria','contador'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT cc.*, u.nombre AS cajero FROM cortes_caja cc
       LEFT JOIN usuarios u ON u.id = cc.usuario_id
       ORDER BY cc.fecha DESC LIMIT 30`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.webhookMP = webhookMP;
