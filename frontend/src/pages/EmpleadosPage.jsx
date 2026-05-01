import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmpleados } from '../api/rh';

const DEPARTAMENTOS = ['Educativo','Administrativo','Servicios','Directivo'];

export default function EmpleadosPage() {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [busqueda,  setBusqueda]  = useState('');
  const [estatus,   setEstatus]   = useState('activo');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmpleados({ q: busqueda || undefined, estatus: estatus || undefined });
      setEmpleados(data);
    } catch {} finally { setLoading(false); }
  }, [busqueda, estatus]);

  useEffect(() => { cargar(); }, [cargar]);

  const badgeEstatus = (e) => ({ activo:'bg-green-100 text-green-800', inactivo:'bg-amber-100 text-amber-700', baja:'bg-red-100 text-red-700' }[e] || '');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Empleados</h1>
          <p className="text-sm text-gray-500 mt-1">{empleados.length} registros</p>
        </div>
        <button onClick={() => navigate('/rh/empleados/nuevo')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Nuevo empleado
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o CURP..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <select value={estatus} onChange={e => setEstatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">Todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando...</div>
        ) : empleados.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No se encontraron empleados</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Empleado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Puesto</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Departamento</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Ingreso</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estatus</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((e, i) => (
                <tr key={e.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i%2===0?'':'bg-gray-50/40'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {e.foto
                        ? <img src={`http://localhost:3003${e.foto}`} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                        : <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
                            {e.nombre[0]}{e.apellido_paterno[0]}
                          </div>
                      }
                      <div>
                        <p className="font-medium text-gray-800">{e.apellido_paterno} {e.apellido_materno} {e.nombre}</p>
                        <p className="text-xs text-gray-400">{e.curp || e.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.puesto || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.departamento || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {e.fecha_ingreso ? new Date(e.fecha_ingreso+'T00:00:00').toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${badgeEstatus(e.estatus)}`}>{e.estatus}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/rh/empleados/${e.id}`)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-50">
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
