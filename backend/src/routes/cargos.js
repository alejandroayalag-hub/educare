const router = require('express').Router();
const pool   = require('../db/pool');
const roles  = require('../middleware/roles');

// GET /api/cargos?alumno_id=&ciclo_id=&estatus=
router.get('/', async (req, res, next) => {
  try {
    const { alumno_id, ciclo_id, estatus } = req.query;
    let where = []; const params = [];
    if (alumno_id) { params.push(alumno_id); where.push(`c.alumno_id=$${params.length}`); }
    if (ciclo_id)  { params.push(ciclo_id);  where.push(`c.ciclo_id=$${params.length}`); }
    if (estatus)   { params.push(estatus);   where.push(`c.estatus=$${params.length}`); }
    const { rows } = await pool.query(
      `SELECT c.*, cp.nombre AS concepto_nombre, cp.tipo,
              a.nombre AS alumno_nombre, a.apellido_paterno
       FROM cargos c
       JOIN conceptos_pago cp ON cp.id = c.concepto_id
       JOIN alumnos a ON a.id = c.alumno_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY c.anio DESC, c.mes DESC, c.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/cargos
router.post('/', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { alumno_id, concepto_id, ciclo_id, descripcion, monto, mes, anio, fecha_vencimiento } = req.body;
    if (!alumno_id || !concepto_id || monto === undefined)
      return res.status(400).json({ error: 'alumno_id, concepto_id y monto son requeridos' });
    const { rows } = await pool.query(
      `INSERT INTO cargos (alumno_id, concepto_id, ciclo_id, descripcion, monto, mes, anio, fecha_vencimiento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [alumno_id, concepto_id, ciclo_id||null, descripcion||null,
       monto, mes||null, anio||null, fecha_vencimiento||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/cargos/masivo — genera cargos mensuales para todos los alumnos activos de un ciclo
router.post('/masivo', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { concepto_id, ciclo_id, mes, anio, fecha_vencimiento } = req.body;
    if (!concepto_id || !ciclo_id || !mes || !anio)
      return res.status(400).json({ error: 'concepto_id, ciclo_id, mes y anio son requeridos' });

    const { rows: [concepto] } = await pool.query('SELECT * FROM conceptos_pago WHERE id=$1', [concepto_id]);
    if (!concepto) return res.status(404).json({ error: 'Concepto no encontrado' });

    // Alumnos activos en el ciclo
    const { rows: inscritos } = await pool.query(
      `SELECT DISTINCT i.alumno_id FROM inscripciones i WHERE i.ciclo_id=$1 AND i.estatus='activo'`,
      [ciclo_id]
    );
    if (!inscritos.length) return res.status(400).json({ error: 'No hay alumnos inscritos activos en este ciclo' });

    let creados = 0;
    for (const { alumno_id } of inscritos) {
      // Evitar duplicados
      const { rows: [existe] } = await pool.query(
        'SELECT id FROM cargos WHERE alumno_id=$1 AND concepto_id=$2 AND mes=$3 AND anio=$4',
        [alumno_id, concepto_id, mes, anio]
      );
      if (!existe) {
        await pool.query(
          `INSERT INTO cargos (alumno_id, concepto_id, ciclo_id, monto, mes, anio, fecha_vencimiento)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [alumno_id, concepto_id, ciclo_id, concepto.monto, mes, anio, fecha_vencimiento||null]
        );
        creados++;
      }
    }
    res.json({ creados, total_alumnos: inscritos.length });
  } catch (err) { next(err); }
});

// PUT /api/cargos/:id
router.put('/:id', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { monto, descripcion, fecha_vencimiento, estatus } = req.body;
    const { rows } = await pool.query(
      `UPDATE cargos SET monto=$1, descripcion=$2, fecha_vencimiento=$3, estatus=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [monto, descripcion||null, fecha_vencimiento||null, estatus||'pendiente', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cargo no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/cargos/:id
router.delete('/:id', roles('directora'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cargos WHERE id=$1 AND estatus=\'pendiente\'', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
