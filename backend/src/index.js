const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const auth         = require('./middleware/auth');
const runMigrations = require('./db/migrate');

const app  = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rutas públicas
app.use('/api/auth',   require('./routes/auth'));
app.get('/api/health', (req, res) => res.json({ ok: true, sistema: 'EDUCARE' }));
app.get('/api/escuela/publica', require('./routes/escuela'));

// Rutas protegidas
app.use('/api/escuela',               auth, require('./routes/escuela'));
app.use('/api/usuarios',              auth, require('./routes/usuarios'));
app.use('/api/ciclos',                auth, require('./routes/ciclos'));
// Control Escolar
app.use('/api/grados',                auth, require('./routes/grados'));
app.use('/api/grupos',                auth, require('./routes/grupos'));
app.use('/api/alumnos',               auth, require('./routes/alumnos'));
app.use('/api/tutores',               auth, require('./routes/tutores'));
app.use('/api/inscripciones',         auth, require('./routes/inscripciones'));
app.use('/api/documentos-alumnos',    auth, require('./routes/documentos-alumnos'));
// Cobranza (webhook de MP sin auth)
app.post('/api/pagos/mp/webhook',     require('./routes/pagos').webhookMP);
app.use('/api/conceptos-pago',        auth, require('./routes/conceptos-pago'));
app.use('/api/cargos',                auth, require('./routes/cargos'));
app.use('/api/pagos',                 auth, require('./routes/pagos'));

// Notificaciones y Finanzas
app.use('/api/notificaciones', auth, require('./routes/notificaciones'));
app.use('/api/finanzas',       auth, require('./routes/finanzas'));
// RH (checadas maneja auth internamente: sync usa x-api-key, panel usa JWT)
app.use('/api/empleados',             auth, require('./routes/empleados'));
app.use('/api/documentos-empleados',  auth, require('./routes/documentos-empleados'));
app.use('/api/checadas',              require('./routes/checadas'));
app.use('/api/nomina',                auth, require('./routes/nomina'));

app.use(errorHandler);

runMigrations()
  .then(() => app.listen(PORT, () => console.log(`EDUCARE backend corriendo en puerto ${PORT}`)))
  .catch(err => { console.error('Error en migraciones:', err); process.exit(1); });
