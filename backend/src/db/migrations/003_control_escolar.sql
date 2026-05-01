-- Grados escolares
CREATE TABLE IF NOT EXISTS grados (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  orden  INTEGER NOT NULL DEFAULT 0
);

INSERT INTO grados (nombre, orden) VALUES
  ('Maternal',   1),
  ('Kinder 1',   2),
  ('Kinder 2',   3),
  ('Kinder 3',   4),
  ('1° Primaria', 5),
  ('2° Primaria', 6),
  ('3° Primaria', 7),
  ('4° Primaria', 8),
  ('5° Primaria', 9),
  ('6° Primaria', 10)
ON CONFLICT DO NOTHING;

-- Grupos por grado y ciclo
CREATE TABLE IF NOT EXISTS grupos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(10) NOT NULL,
  grado_id    INTEGER NOT NULL REFERENCES grados(id),
  ciclo_id    INTEGER NOT NULL REFERENCES ciclos_escolares(id) ON DELETE CASCADE,
  maestro_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  capacidad   INTEGER NOT NULL DEFAULT 20,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (nombre, grado_id, ciclo_id)
);

-- Alumnos
CREATE TABLE IF NOT EXISTS alumnos (
  id                  SERIAL PRIMARY KEY,
  nombre              VARCHAR(100) NOT NULL,
  apellido_paterno    VARCHAR(100) NOT NULL,
  apellido_materno    VARCHAR(100),
  fecha_nacimiento    DATE NOT NULL,
  curp                CHAR(18) UNIQUE,
  sexo                VARCHAR(10) CHECK (sexo IN ('masculino','femenino','otro')),
  direccion           TEXT,
  alergias            TEXT,
  condiciones_medicas TEXT,
  tipo_sangre         VARCHAR(5),
  foto                VARCHAR(500),
  estatus             VARCHAR(20) NOT NULL DEFAULT 'activo'
                      CHECK (estatus IN ('activo','inactivo','egresado','baja')),
  observaciones       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tutores / padres de familia
CREATE TABLE IF NOT EXISTS tutores (
  id               SERIAL PRIMARY KEY,
  alumno_id        INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  nombre           VARCHAR(200) NOT NULL,
  parentesco       VARCHAR(50) NOT NULL DEFAULT 'madre',
  telefono         VARCHAR(20),
  telefono_trabajo VARCHAR(20),
  email            VARCHAR(150),
  ocupacion        VARCHAR(100),
  es_responsable   BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inscripciones alumno → grupo + ciclo
CREATE TABLE IF NOT EXISTS inscripciones (
  id          SERIAL PRIMARY KEY,
  alumno_id   INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  grupo_id    INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  ciclo_id    INTEGER NOT NULL REFERENCES ciclos_escolares(id) ON DELETE CASCADE,
  fecha_inscripcion DATE NOT NULL DEFAULT CURRENT_DATE,
  estatus     VARCHAR(20) NOT NULL DEFAULT 'activo'
              CHECK (estatus IN ('activo','baja','egresado')),
  UNIQUE (alumno_id, ciclo_id)
);

-- Tipos de documento para alumnos
CREATE TABLE IF NOT EXISTS tipos_documento_alumno (
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL UNIQUE,
  requerido BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO tipos_documento_alumno (nombre, requerido) VALUES
  ('Acta de nacimiento',          true),
  ('CURP',                        true),
  ('Cartilla de vacunación',      true),
  ('Comprobante de domicilio',    true),
  ('Certificado médico',          true),
  ('Historial académico anterior',false),
  ('Foto 2x2',                    false),
  ('Autorización de salida',      false)
ON CONFLICT DO NOTHING;

-- Documentos subidos por alumno
CREATE TABLE IF NOT EXISTS documentos_alumno (
  id           SERIAL PRIMARY KEY,
  alumno_id    INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  tipo_id      INTEGER NOT NULL REFERENCES tipos_documento_alumno(id),
  filename     VARCHAR(255) NOT NULL,
  ruta         VARCHAR(500) NOT NULL,
  estatus      VARCHAR(20) NOT NULL DEFAULT 'completo'
               CHECK (estatus IN ('completo','pendiente','vencido')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alumno_id, tipo_id)
);
