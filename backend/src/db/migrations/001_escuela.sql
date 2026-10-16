-- Configuración de la escuela
CREATE TABLE IF NOT EXISTS escuela (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL DEFAULT 'EDUCARE',
  slogan      VARCHAR(200),
  direccion   TEXT,
  telefono    VARCHAR(20),
  email       VARCHAR(150),
  rfc         VARCHAR(13),
  logo_ruta   VARCHAR(500),
  color_primario VARCHAR(7) DEFAULT '#2563eb',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO escuela (nombre) VALUES ('EDUCARE') ON CONFLICT DO NOTHING;

-- Ciclos escolares
CREATE TABLE IF NOT EXISTS ciclos_escolares (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(50) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
