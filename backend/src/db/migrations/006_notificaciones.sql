-- Historial de notificaciones enviadas a padres
CREATE TABLE IF NOT EXISTS notificaciones (
  id          SERIAL PRIMARY KEY,
  alumno_id   INTEGER REFERENCES alumnos(id) ON DELETE SET NULL,
  tutor_id    INTEGER REFERENCES tutores(id) ON DELETE SET NULL,
  tipo        VARCHAR(30) NOT NULL DEFAULT 'aviso'
              CHECK (tipo IN ('aviso','pago_vencido','pago_recibido','recordatorio')),
  canal       VARCHAR(20) NOT NULL DEFAULT 'email'
              CHECK (canal IN ('email','whatsapp','ambos')),
  destinatario VARCHAR(200) NOT NULL,
  asunto      VARCHAR(200),
  mensaje     TEXT NOT NULL,
  estatus     VARCHAR(20) NOT NULL DEFAULT 'enviado'
              CHECK (estatus IN ('enviado','fallido','pendiente')),
  error_msg   TEXT,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_alumno ON notificaciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo   ON notificaciones(tipo);
