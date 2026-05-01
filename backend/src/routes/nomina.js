const router   = require('express').Router();
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const pool     = require('../db/pool');
const roles    = require('../middleware/roles');

const nominaDir = path.join(__dirname, '..', '..', 'uploads', 'nomina');
fs.mkdirSync(nominaDir, { recursive: true });
const upload = multer({ dest: nominaDir });

function normalizar(str) {
  return (str || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function parsearPDF(texto) {
  const registros = [];
  const secciones = texto.split('Resultado del traspaso').slice(1);

  if (secciones.length > 0) {
    for (const sec of secciones) {
      const lineas = sec.split('\n').map(l => l.trim()).filter(Boolean);
      let nombre_pdf = null, cuenta = null, monto = null, autorizado = null;
      for (const linea of lineas) {
        if (/^Nombre:\s+/i.test(linea))             nombre_pdf  = linea.replace(/^Nombre:\s+/i, '').trim();
        if (/^Cuenta de dep[oó]sito:\s+/i.test(linea)) cuenta = linea.replace(/^Cuenta de dep[oó]sito:\s+/i, '').trim().replace(/\s+/g, '');
        if (/^Importe:/i.test(linea)) { const m = linea.match(/([\d,]+\.\d{2})/); if (m) monto = parseFloat(m[1].replace(/,/g, '')); }
        if (/AUTORIZADO|APLICADO|PAGADO|REALIZADO|LIQUIDADO/i.test(linea))
          autorizado = linea.match(/AUTORIZADO|APLICADO|PAGADO|REALIZADO|LIQUIDADO/i)[0].toUpperCase();
      }
      if (nombre_pdf && monto) registros.push({ nombre_pdf, cuenta, monto, autorizado });
    }
    return registros;
  }

  // Fallback: formato genérico
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  for (const linea of lineas) {
    const montoMatch = linea.match(/\$?\s*([\d,]+\.\d{2})/);
    if (!montoMatch) continue;
    const monto = parseFloat(montoMatch[1].replace(/,/g, ''));
    if (!monto || monto <= 0) continue;
    const cuentaMatch = linea.match(/\b(\d{10,18})\b/);
    let resto = linea.replace(cuentaMatch?.[0] || '', '').replace(montoMatch[0], '').replace(/[0-9,$.,]/g, ' ').replace(/\s+/g, ' ').trim();
    const nombreMatch = resto.match(/[A-ZÁÉÍÓÚÜÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ]{2,})+/);
    if (!nombreMatch || nombreMatch[0].length < 5) continue;
    registros.push({ nombre_pdf: nombreMatch[0].trim(), cuenta: cuentaMatch?.[1] || null, monto, autorizado: null });
  }
  return registros;
}

async function matchEmpleados() {
  const { rows } = await pool.query(`SELECT id, nombre, apellido_paterno, apellido_materno FROM empleados WHERE estatus='activo'`);
  return rows.map(e => ({
    id: e.id,
    norm: normalizar(`${e.apellido_paterno} ${e.apellido_materno || ''} ${e.nombre}`),
    display: `${e.apellido_paterno} ${e.apellido_materno || ''}, ${e.nombre}`.trim(),
  }));
}

function matchUno(nombrePdf, empleados) {
  const n = normalizar(nombrePdf);
  const exacto = empleados.find(e => e.norm === n);
  if (exacto) return exacto;
  return empleados.find(e => {
    const partes = e.norm.split(' ').filter(Boolean);
    return partes.length >= 2 && partes.every(p => n.includes(p));
  }) || null;
}

// POST /api/nomina/parsear
router.post('/parsear', roles('directora','secretaria'), upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió PDF' });
    const buf = fs.readFileSync(req.file.path);
    const data = await pdfParse(buf);
    fs.unlinkSync(req.file.path);
    const registros = parsearPDF(data.text);
    const empleados = await matchEmpleados();
    const preview = registros.map(r => {
      const match = matchUno(r.nombre_pdf, empleados);
      return { ...r, empleado_id: match?.id || null, empleado_display: match?.display || null };
    });
    res.json({ preview, total: preview.length });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
});

// POST /api/nomina/importar
router.post('/importar', roles('directora','secretaria'), upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió PDF' });
    const { semana, anio, registros: registrosJson } = req.body;
    if (!semana || !anio) return res.status(400).json({ error: 'Semana y año son requeridos' });

    const { rows: [existe] } = await pool.query('SELECT id FROM semanas_nomina WHERE semana=$1 AND anio=$2', [semana, anio]);
    if (existe) return res.status(409).json({ error: `La semana ${semana}/${anio} ya fue importada` });

    const registros = JSON.parse(registrosJson);
    const filename = `nomina_s${semana}_${anio}_${Date.now()}.pdf`;
    const ruta = path.join(nominaDir, filename);
    fs.renameSync(req.file.path, ruta);

    const { rows: [semanaRec] } = await pool.query(
      `INSERT INTO semanas_nomina (semana, anio, filename, ruta, total_registros)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [parseInt(semana), parseInt(anio), filename, ruta, registros.length]
    );

    for (const r of registros) {
      await pool.query(
        `INSERT INTO pagos_nomina (semana_nomina_id, empleado_id, nombre_pdf, cuenta, monto, autorizado)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [semanaRec.id, r.empleado_id || null, r.nombre_pdf, r.cuenta || null, r.monto || null, r.autorizado || null]
      );
    }
    res.status(201).json(semanaRec);
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
});

// GET /api/nomina/semanas
router.get('/semanas', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM semanas_nomina ORDER BY anio DESC, semana DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/nomina/semana/:id
router.get('/semana/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pn.*, e.nombre, e.apellido_paterno, e.apellido_materno
       FROM pagos_nomina pn LEFT JOIN empleados e ON e.id = pn.empleado_id
       WHERE pn.semana_nomina_id=$1 ORDER BY e.apellido_paterno, pn.nombre_pdf`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/nomina/semana/:id/descargar
router.get('/semana/:id/descargar', async (req, res, next) => {
  try {
    const { rows: [s] } = await pool.query('SELECT * FROM semanas_nomina WHERE id=$1', [req.params.id]);
    if (!s) return res.status(404).json({ error: 'No encontrada' });
    res.download(path.resolve(s.ruta), s.filename);
  } catch (err) { next(err); }
});

// DELETE /api/nomina/semana/:id
router.delete('/semana/:id', roles('directora'), async (req, res, next) => {
  try {
    const { rows: [s] } = await pool.query('SELECT * FROM semanas_nomina WHERE id=$1', [req.params.id]);
    if (s && fs.existsSync(s.ruta)) fs.unlinkSync(s.ruta);
    await pool.query('DELETE FROM semanas_nomina WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

// GET /api/nomina/empleado/:id
router.get('/empleado/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pn.*, sn.semana, sn.anio
       FROM pagos_nomina pn JOIN semanas_nomina sn ON sn.id = pn.semana_nomina_id
       WHERE pn.empleado_id=$1 ORDER BY sn.anio DESC, sn.semana DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
