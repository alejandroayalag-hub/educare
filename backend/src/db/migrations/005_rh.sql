-- Tipos de documento para empleados
CREATE TABLE IF NOT EXISTS tipos_documento_empleado (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL UNIQUE,
  requerido      BOOLEAN NOT NULL DEFAULT true,
  formato_ruta   TEXT
);

INSERT INTO tipos_documento_empleado (nombre, requerido) VALUES
  ('Contrato de trabajo',                           true),
  ('Solicitud de empleo con fotografía',            true),
  ('Copia de acta de nacimiento',                   true),
  ('Copia de identificación',                       true),
  ('Copia de comprobante de domicilio',             true),
  ('Número de seguridad social',                    true),
  ('Constancia de RFC',                             true),
  ('Certificado médico',                            true),
  ('Comprobante de estudios',                       false),
  ('Tarjeta de nómina',                             true),
  ('Convenio de horario',                           true),
  ('Aviso de privacidad',                           true),
  ('Reglamento interior',                           true),
  ('Convenio de pago electrónico',                  false),
  ('Contacto de emergencia',                        false)
ON CONFLICT DO NOTHING;

-- Empleados de la escuela
CREATE TABLE IF NOT EXISTS empleados (
  id                            SERIAL PRIMARY KEY,
  nombre                        VARCHAR(100) NOT NULL,
  apellido_paterno              VARCHAR(100) NOT NULL,
  apellido_materno              VARCHAR(100),
  curp                          CHAR(18) UNIQUE,
  rfc                           VARCHAR(13) UNIQUE,
  fecha_nacimiento              DATE,
  fecha_ingreso                 DATE NOT NULL DEFAULT CURRENT_DATE,
  puesto                        VARCHAR(100),
  departamento                  VARCHAR(100),
  telefono                      VARCHAR(20),
  email                         VARCHAR(150),
  direccion                     TEXT,
  nombre_beneficiario           VARCHAR(200),
  contacto_emergencia_nombre    TEXT,
  contacto_emergencia_telefono  VARCHAR(20),
  foto                          VARCHAR(500),
  observaciones                 TEXT,
  estatus                       VARCHAR(20) NOT NULL DEFAULT 'activo'
                                CHECK (estatus IN ('activo','inactivo','baja')),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documentos por empleado
CREATE TABLE IF NOT EXISTS documentos_empleado (
  id                   SERIAL PRIMARY KEY,
  empleado_id          INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo_documento_id    INTEGER NOT NULL REFERENCES tipos_documento_empleado(id),
  filename             VARCHAR(255) NOT NULL,
  ruta                 VARCHAR(500) NOT NULL,
  estatus              VARCHAR(20) NOT NULL DEFAULT 'completo'
                       CHECK (estatus IN ('completo','pendiente','vencido')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empleado_id, tipo_documento_id)
);

-- Dispositivos checadores
CREATE TABLE IF NOT EXISTS checador_dispositivos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  ubicacion   VARCHAR(150),
  ip          VARCHAR(45),
  api_key     VARCHAR(64) NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mapeo UID del checador → empleado
CREATE TABLE IF NOT EXISTS checador_empleados (
  id               SERIAL PRIMARY KEY,
  empleado_id      INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  dispositivo_id   INTEGER NOT NULL REFERENCES checador_dispositivos(id) ON DELETE CASCADE,
  uid_checador     INTEGER NOT NULL,
  UNIQUE (dispositivo_id, uid_checador)
);

-- Checadas
CREATE TABLE IF NOT EXISTS checadas (
  id               SERIAL PRIMARY KEY,
  empleado_id      INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  dispositivo_id   INTEGER NOT NULL REFERENCES checador_dispositivos(id),
  timestamp        TIMESTAMPTZ NOT NULL,
  tipo             VARCHAR(10) NOT NULL DEFAULT 'entrada'
                   CHECK (tipo IN ('entrada','salida','desconocido')),
  uid_checador     INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dispositivo_id, uid_checador, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_checadas_empleado   ON checadas(empleado_id);
CREATE INDEX IF NOT EXISTS idx_checadas_timestamp  ON checadas(timestamp);

-- Nómina: semanas de pago (nombre distinto a "pagos" de cobranza)
CREATE TABLE IF NOT EXISTS semanas_nomina (
  id              SERIAL PRIMARY KEY,
  semana          INTEGER NOT NULL,
  anio            INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  filename        VARCHAR(255) NOT NULL,
  ruta            VARCHAR(500) NOT NULL,
  total_registros INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(semana, anio)
);

-- Registros de pago de nómina por empleado
CREATE TABLE IF NOT EXISTS pagos_nomina (
  id               SERIAL PRIMARY KEY,
  semana_nomina_id INTEGER NOT NULL REFERENCES semanas_nomina(id) ON DELETE CASCADE,
  empleado_id      INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  nombre_pdf       VARCHAR(200) NOT NULL,
  cuenta           VARCHAR(50),
  monto            DECIMAL(12,2),
  autorizado       VARCHAR(100),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
