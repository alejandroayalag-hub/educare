-- Conceptos de pago configurables
CREATE TABLE IF NOT EXISTS conceptos_pago (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  monto       NUMERIC(10,2) NOT NULL DEFAULT 0,
  tipo        VARCHAR(20) NOT NULL DEFAULT 'mensualidad'
              CHECK (tipo IN ('inscripcion','mensualidad','guarderia','uniforme','otro')),
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO conceptos_pago (nombre, tipo, monto) VALUES
  ('Inscripción',              'inscripcion', 1500.00),
  ('Mensualidad Maternal',     'mensualidad',  1800.00),
  ('Mensualidad Kinder',       'mensualidad',  2000.00),
  ('Mensualidad Primaria',     'mensualidad',  2200.00),
  ('Guardería tarde',          'guarderia',     800.00),
  ('Uniforme',                 'uniforme',      600.00)
ON CONFLICT DO NOTHING;

-- Cargos asignados a cada alumno
CREATE TABLE IF NOT EXISTS cargos (
  id                SERIAL PRIMARY KEY,
  alumno_id         INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  concepto_id       INTEGER NOT NULL REFERENCES conceptos_pago(id),
  ciclo_id          INTEGER REFERENCES ciclos_escolares(id),
  descripcion       VARCHAR(200),
  monto             NUMERIC(10,2) NOT NULL,
  mes               INTEGER CHECK (mes BETWEEN 1 AND 12),
  anio              INTEGER,
  fecha_vencimiento DATE,
  estatus           VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                    CHECK (estatus IN ('pendiente','pagado','vencido','cancelado')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pagos registrados
CREATE TABLE IF NOT EXISTS pagos (
  id                 SERIAL PRIMARY KEY,
  alumno_id          INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  cargo_id           INTEGER REFERENCES cargos(id) ON DELETE SET NULL,
  monto              NUMERIC(10,2) NOT NULL,
  metodo             VARCHAR(20) NOT NULL DEFAULT 'efectivo'
                     CHECK (metodo IN ('efectivo','tarjeta','transferencia')),
  referencia         VARCHAR(100),
  mp_preference_id   VARCHAR(200),
  mp_payment_id      VARCHAR(100),
  mp_status          VARCHAR(50),
  notas              TEXT,
  usuario_id         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_pago         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cortes de caja diarios
CREATE TABLE IF NOT EXISTS cortes_caja (
  id                    SERIAL PRIMARY KEY,
  usuario_id            INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha                 DATE NOT NULL DEFAULT CURRENT_DATE,
  total_efectivo        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_tarjeta         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_transferencia   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  num_pagos             INTEGER NOT NULL DEFAULT 0,
  notas                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fecha)
);
