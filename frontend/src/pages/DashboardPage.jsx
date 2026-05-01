import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlumnos, getGrupos } from '../api/controlEscolar';
import { getCiclos } from '../api/ciclos';
import { getResumenDia } from '../api/cobranza';
import { getEmpleados } from '../api/rh';
import { getResumenFinanzas } from '../api/finanzas';

const fmt = (n) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n || 0);

export default function DashboardPage() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('nombre');
  const rol    = localStorage.getItem('rol');
  const hoy    = new Date();
  const [stats, setStats] = useState({ alumnos:'…', grupos:'…', ciclo:'…', cobranza:'…', empleados:'…', finanzas:'…' });

  useEffect(() => {
    const mes  = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();

    Promise.all([
      getAlumnos({ estatus: 'activo' }),
      getCiclos(),
      getResumenDia(),
      getEmpleados({ activo: true }).catch(() => null),
      getResumenFinanzas(mes, anio).catch(() => null),
    ]).then(([alumnos, ciclos, resumen, empleados, finanzas]) => {
      const cicloActivo = ciclos.find(c => c.activo);
      setStats(s => ({
        ...s,
        alumnos:   alumnos.length,
        ciclo:     cicloActivo?.nombre || 'Sin ciclo activo',
        cobranza:  fmt(resumen.total),
        empleados: empleados ? empleados.length : '—',
        finanzas:  finanzas  ? fmt(finanzas.utilidad) : '—',
      }));
      if (cicloActivo) {
        getGrupos(cicloActivo.id).then(gs => setStats(s => ({ ...s, grupos: gs.length })));
      } else {
        setStats(s => ({ ...s, grupos: 0 }));
      }
    }).catch(() => {});
  }, []);

  const tarjetas = [
    { titulo:'Alumnos activos', valor: stats.alumnos,   icono:'🎒', color:'bg-indigo-50 border-indigo-100',  accion: () => navigate('/control-escolar/alumnos'), label:'Ver alumnos', roles: null },
    { titulo:'Grupos',          valor: stats.grupos,    icono:'📚', color:'bg-emerald-50 border-emerald-100', accion: () => navigate('/control-escolar/grupos'),  label:'Ver grupos',  roles: null },
    { titulo:'Ciclo activo',    valor: stats.ciclo,     icono:'📅', color:'bg-amber-50 border-amber-100',    small: true, roles: null },
    { titulo:'Cobranza hoy',    valor: stats.cobranza,  icono:'💳', color:'bg-green-50 border-green-100',    accion: () => navigate('/cobranza'),                label:'Ver cobranza', roles: ['directora','secretaria','contador'] },
    { titulo:'Empleados activos', valor: stats.empleados, icono:'👩‍🏫', color:'bg-violet-50 border-violet-100', accion: () => navigate('/rh/empleados'), label:'Ver RH', roles: ['directora','secretaria'] },
    { titulo:'Utilidad del mes', valor: stats.finanzas, icono:'📊', color:'bg-blue-50 border-blue-100',      accion: () => navigate('/finanzas'),                label:'Ver finanzas', roles: ['directora','contador'] },
  ];

  const visibles = tarjetas.filter(t => !t.roles || t.roles.includes(rol));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Bienvenida, {nombre}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {hoy.toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibles.map(t => (
          <div key={t.titulo} className={`rounded-xl border p-5 ${t.color}`}>
            <div className="flex items-center justify-between">
              <span className="text-3xl">{t.icono}</span>
              {t.accion && (
                <button onClick={t.accion} className="text-xs text-indigo-600 hover:underline font-medium">
                  {t.label} →
                </button>
              )}
            </div>
            <p className={`font-bold text-gray-800 mt-3 ${t.small ? 'text-base' : 'text-3xl'}`}>{t.valor}</p>
            <p className="text-sm text-gray-500 mt-0.5">{t.titulo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
