import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlumnos } from '../api/controlEscolar';

const ESTATUSES = ['activo','inactivo','egresado','baja'];

export default function AlumnosPage() {
  const navigate = useNavigate();
  const [alumnos, setAlumnos]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [estatus, setEstatus]   = useState('activo');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAlumnos({ q: busqueda || undefined, estatus: estatus || undefined });
      setAlumnos(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [busqueda, estatus]);

  useEffect(() => { cargar(); }, [cargar]);

  const calcularEdad = (fecha) => {
    if (!fecha) return '—';
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return `${edad} años`;
  };

  const badgeEstatus = (e) => {
    const map = { activo:'bg-green-100 text-green-800', inactivo:'bg-gray-100 text-gray-600',
                  egresado:'bg-blue-100 text-blue-800', baja:'bg-red-100 text-red-700' };
    return map[e] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Alumnos</h1>
          <p className="text-sm text-gray-500 mt-1">{alumnos.length} registros encontrados</p>
        </div>
        <button
          onClick={() => navigate('/control-escolar/alumnos/nuevo')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Nuevo alumno
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          type="text" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o CURP..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select value={estatus} onChange={e => setEstatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">Todos los estatus</option>
          {ESTATUSES.map(e => <option key={e} value={e} className="capitalize">{e}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando...</div>
        ) : alumnos.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No se encontraron alumnos</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Alumno</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Edad / Nacimiento</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Grupo actual</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estatus</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a, i) => (
                <tr key={a.id} className={`border-b border-gray-100 hover:bg-gray-50 transition ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.foto
                        ? <img src={`http://localhost:3003${a.foto}`} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                        : <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {a.nombre[0]}{a.apellido_paterno[0]}
                          </div>
                      }
                      <div>
                        <p className="font-medium text-gray-800">{a.apellido_paterno} {a.apellido_materno} {a.nombre}</p>
                        <p className="text-xs text-gray-400">{a.curp || 'Sin CURP'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{calcularEdad(a.fecha_nacimiento)}</p>
                    <p className="text-xs text-gray-400">{a.fecha_nacimiento ? new Date(a.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-MX') : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.inscripcion_actual
                      ? <span>{a.inscripcion_actual.grado_nombre} — {a.inscripcion_actual.grupo_nombre}</span>
                      : <span className="text-gray-400 text-xs">Sin inscripción</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${badgeEstatus(a.estatus)}`}>
                      {a.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/control-escolar/alumnos/${a.id}`)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-50"
                    >
                      Ver expediente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
