const router = require('express').Router();
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');

// GET /api/finanzas/resumen?mes=&anio=
router.get('/resumen', async (req, res, next) => {
  try {
    const mes  = parseInt(req.query.mes  || new Date().getMonth() + 1);
    const anio = parseInt(req.query.anio || new Date().getFullYear());

    const inicio = `${anio}-${String(mes).padStart(2,'0')}-01`;
    const fin    = new Date(anio, mes, 0).toISOString().slice(0,10);

    // Ingresos del mes (pagos registrados)
    const { rows: [ing] } = await pool.query(
      `SELECT COALESCE(SUM(monto),0) AS total,
              COALESCE(SUM(CASE WHEN metodo='efectivo'      THEN monto ELSE 0 END),0) AS efectivo,
              COALESCE(SUM(CASE WHEN metodo='tarjeta'       THEN monto ELSE 0 END),0) AS tarjeta,
              COALESCE(SUM(CASE WHEN metodo='transferencia' THEN monto ELSE 0 END),0) AS transferencia,
              COUNT(*) AS num_pagos
       FROM pagos WHERE fecha_pago::date BETWEEN $1 AND $2`,
      [inicio, fin]
    );

    // Egresos del mes
    const { rows: [egr] } = await pool.query(
      `SELECT COALESCE(SUM(monto),0) AS total, COUNT(*) AS num_egresos
       FROM egresos WHERE fecha BETWEEN $1 AND $2`,
      [inicio, fin]
    );

    // Egresos por categoría
    const { rows: porCategoria } = await pool.query(
      `SELECT categoria, COALESCE(SUM(monto),0) AS total
       FROM egresos WHERE fecha BETWEEN $1 AND $2 GROUP BY categoria ORDER BY total DESC`,
      [inicio, fin]
    );

    // Ingresos diarios del mes (para gráfica)
    const { rows: ingresosDiarios } = await pool.query(
      `SELECT fecha_pago::date AS fecha, SUM(monto) AS total
       FROM pagos WHERE fecha_pago::date BETWEEN $1 AND $2
       GROUP BY fecha_pago::date ORDER BY fecha`,
      [inicio, fin]
    );

    // Últimos 6 meses comparativo
    const { rows: historico } = await pool.query(
      `SELECT TO_CHAR(d, 'YYYY-MM') AS periodo,
              COALESCE(SUM(p.monto),0) AS ingresos
       FROM generate_series(
         (date_trunc('month', $1::date) - interval '5 months')::date,
         date_trunc('month', $1::date)::date,
         '1 month'
       ) d
       LEFT JOIN pagos p ON TO_CHAR(p.fecha_pago, 'YYYY-MM') = TO_CHAR(d, 'YYYY-MM')
       GROUP BY periodo ORDER BY periodo`,
      [inicio]
    );

    // Cargos pendientes acumulados
    const { rows: [pendientes] } = await pool.query(
      `SELECT COALESCE(SUM(monto),0) AS total, COUNT(*) AS num
       FROM cargos WHERE estatus='pendiente'`
    );

    res.json({
      periodo: { mes, anio, inicio, fin },
      ingresos: { ...ing, total: parseFloat(ing.total) },
      egresos:  { total: parseFloat(egr.total), num_egresos: parseInt(egr.num_egresos) },
      utilidad: parseFloat(ing.total) - parseFloat(egr.total),
      por_categoria: porCategoria,
      ingresos_diarios: ingresosDiarios,
      historico,
      pendientes_por_cobrar: { total: parseFloat(pendientes.total), num: parseInt(pendientes.num) },
    });
  } catch (err) { next(err); }
});

// GET /api/finanzas/egresos?mes=&anio=&categoria=
router.get('/egresos', async (req, res, next) => {
  try {
    const { mes, anio, categoria } = req.query;
    let where = []; const params = [];
    if (mes && anio) {
      const inicio = `${anio}-${String(mes).padStart(2,'0')}-01`;
      const fin    = new Date(parseInt(anio), parseInt(mes), 0).toISOString().slice(0,10);
      params.push(inicio, fin); where.push(`e.fecha BETWEEN $${params.length-1} AND $${params.length}`);
    }
    if (categoria) { params.push(categoria); where.push(`e.categoria=$${params.length}`); }
    const { rows } = await pool.query(
      `SELECT e.*, u.nombre AS usuario_nombre
       FROM egresos e LEFT JOIN usuarios u ON u.id = e.usuario_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY e.fecha DESC, e.id DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/finanzas/egresos
router.post('/egresos', roles('directora','secretaria','contador'), async (req, res, next) => {
  try {
    const { concepto, categoria, monto, fecha, proveedor, referencia, notas } = req.body;
    if (!concepto || !monto) return res.status(400).json({ error: 'Concepto y monto son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO egresos (concepto, categoria, monto, fecha, proveedor, referencia, notas, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [concepto, categoria||'operativo', monto, fecha||new Date().toISOString().slice(0,10),
       proveedor||null, referencia||null, notas||null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/finanzas/egresos/:id
router.put('/egresos/:id', roles('directora','contador'), async (req, res, next) => {
  try {
    const { concepto, categoria, monto, fecha, proveedor, referencia, notas } = req.body;
    const { rows } = await pool.query(
      `UPDATE egresos SET concepto=$1, categoria=$2, monto=$3, fecha=$4,
         proveedor=$5, referencia=$6, notas=$7 WHERE id=$8 RETURNING *`,
      [concepto, categoria, monto, fecha, proveedor||null, referencia||null, notas||null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Egreso no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/finanzas/egresos/:id
router.delete('/egresos/:id', roles('directora'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM egresos WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
