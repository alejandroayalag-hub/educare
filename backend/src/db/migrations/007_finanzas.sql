-- Egresos / gastos de la escuela
CREATE TABLE IF NOT EXISTS egresos (
  id          SERIAL PRIMARY KEY,
  concepto    VARCHAR(200) NOT NULL,
  categoria   VARCHAR(50) NOT NULL DEFAULT 'operativo'
              CHECK (categoria IN ('nomina','renta','servicios','mantenimiento','material','operativo','otro')),
  monto       NUMERIC(10,2) NOT NULL,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  proveedor   VARCHAR(150),
  referencia  VARCHAR(100),
  notas       TEXT,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egresos_fecha ON egresos(fecha);
