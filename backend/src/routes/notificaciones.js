const router     = require('express').Router();
const pool       = require('../db/pool');
const roles      = require('../middleware/roles');
const nodemailer = require('nodemailer');

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function enviarEmail(destinatario, asunto, html) {
  const t = getTransporter();
  if (!t) throw new Error('SMTP no configurado');
  await t.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'EDUCARE'}" <${process.env.SMTP_USER}>`,
    to: destinatario,
    subject: asunto,
    html,
  });
}

function whatsappUrl(telefono, mensaje) {
  const limpio = (telefono || '').replace(/\D/g, '');
  const num = limpio.startsWith('52') ? limpio : `52${limpio}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}

// GET /api/notificaciones?alumno_id=&tipo=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { alumno_id, tipo } = req.query;
    let where = []; const params = [];
    if (alumno_id) { params.push(alumno_id); where.push(`n.alumno_id=$${params.length}`); }
    if (tipo)      { params.push(tipo);      where.push(`n.tipo=$${params.length}`); }
    const { rows } = await pool.query(
      `SELECT n.*, a.nombre AS alumno_nombre, a.apellido_paterno, u.nombre AS usuario_nombre
       FROM notificaciones n
       LEFT JOIN alumnos a ON a.id = n.alumno_id
       LEFT JOIN usuarios u ON u.id = n.usuario_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY n.created_at DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/notificaciones/enviar — envía y guarda en historial
router.post('/enviar', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { alumno_id, tutor_id, tipo, canal, asunto, mensaje } = req.body;
    if (!mensaje) return res.status(400).json({ error: 'El mensaje es requerido' });

    let destinatario = req.body.destinatario || '';
    let tutor_email = '', tutor_tel = '';

    // Si viene tutor_id, buscar sus datos
    if (tutor_id) {
      const { rows: [t] } = await pool.query('SELECT * FROM tutores WHERE id=$1', [tutor_id]);
      if (t) { tutor_email = t.email || ''; tutor_tel = t.telefono || ''; }
    }

    const resultados = [];

    // Email
    if ((canal === 'email' || canal === 'ambos') && (destinatario || tutor_email)) {
      const dest = destinatario || tutor_email;
      let estatus = 'enviado', error_msg = null;
      try {
        await enviarEmail(dest, asunto || 'Aviso escolar EDUCARE', `<p>${mensaje.replace(/\n/g, '<br>')}</p>`);
      } catch (e) {
        estatus = 'fallido'; error_msg = e.message;
      }
      const { rows: [n] } = await pool.query(
        `INSERT INTO notificaciones (alumno_id, tutor_id, tipo, canal, destinatario, asunto, mensaje, estatus, error_msg, usuario_id)
         VALUES ($1,$2,$3,'email',$4,$5,$6,$7,$8,$9) RETURNING *`,
        [alumno_id||null, tutor_id||null, tipo||'aviso', dest, asunto||null, mensaje, estatus, error_msg, req.user.id]
      );
      resultados.push(n);
    }

    // WhatsApp — genera link (no envía automáticamente)
    if ((canal === 'whatsapp' || canal === 'ambos') && (req.body.telefono || tutor_tel)) {
      const tel = req.body.telefono || tutor_tel;
      const link = whatsappUrl(tel, mensaje);
      const { rows: [n] } = await pool.query(
        `INSERT INTO notificaciones (alumno_id, tutor_id, tipo, canal, destinatario, asunto, mensaje, estatus, usuario_id)
         VALUES ($1,$2,$3,'whatsapp',$4,$5,$6,'enviado',$7) RETURNING *`,
        [alumno_id||null, tutor_id||null, tipo||'aviso', tel, asunto||null, mensaje, req.user.id]
      );
      resultados.push({ ...n, whatsapp_url: link });
    }

    if (!resultados.length) return res.status(400).json({ error: 'No se pudo determinar destinatario' });
    res.status(201).json(resultados);
  } catch (err) { next(err); }
});

// POST /api/notificaciones/masivo — aviso a todos los padres con cargo vencido
router.post('/masivo', roles('directora','secretaria'), async (req, res, next) => {
  try {
    const { tipo, asunto, mensaje, ciclo_id } = req.body;
    if (!mensaje) return res.status(400).json({ error: 'Mensaje requerido' });

    // Alumnos con cargos pendientes
    const { rows: cargos } = await pool.query(
      `SELECT DISTINCT c.alumno_id,
         a.nombre AS alumno_nombre, a.apellido_paterno,
         t.email, t.telefono, t.nombre AS tutor_nombre, t.id AS tutor_id
       FROM cargos c
       JOIN alumnos a ON a.id = c.alumno_id
       LEFT JOIN tutores t ON t.alumno_id = a.id AND t.es_responsable = true
       WHERE c.estatus='pendiente'
       ${ciclo_id ? 'AND c.ciclo_id=' + parseInt(ciclo_id) : ''}
       AND a.estatus='activo'`
    );

    let enviados = 0, fallidos = 0, sin_contacto = 0;
    for (const row of cargos) {
      const msg = mensaje
        .replace('{nombre}', row.alumno_nombre)
        .replace('{apellido}', row.apellido_paterno)
        .replace('{tutor}', row.tutor_nombre || '');

      if (row.email) {
        let estatus = 'enviado', error_msg = null;
        try { await enviarEmail(row.email, asunto || 'Recordatorio de pago — EDUCARE', `<p>${msg.replace(/\n/g,'<br>')}</p>`); enviados++; }
        catch (e) { estatus = 'fallido'; error_msg = e.message; fallidos++; }
        await pool.query(
          `INSERT INTO notificaciones (alumno_id, tutor_id, tipo, canal, destinatario, asunto, mensaje, estatus, error_msg, usuario_id)
           VALUES ($1,$2,$3,'email',$4,$5,$6,$7,$8,$9)`,
          [row.alumno_id, row.tutor_id||null, tipo||'pago_vencido', row.email, asunto||null, msg, estatus, error_msg, req.user.id]
        );
      } else { sin_contacto++; }
    }

    res.json({ total: cargos.length, enviados, fallidos, sin_contacto });
  } catch (err) { next(err); }
});

// GET /api/notificaciones/whatsapp-url — genera link de WhatsApp sin guardar
router.get('/whatsapp-url', (req, res) => {
  const { telefono, mensaje } = req.query;
  if (!telefono || !mensaje) return res.status(400).json({ error: 'telefono y mensaje requeridos' });
  res.json({ url: whatsappUrl(telefono, mensaje) });
});

module.exports = router;
