import { useState, useCallback } from 'react';
import { getAlumnos } from '../../api/controlEscolar';
import { getCargos, getPagos } from '../../api/cobranza';
import ModalPago from './ModalPago';

const fmt = (n) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n || 0);

const badgeCargo = (e) => ({
  pendiente: 'bg-amber-100 text-amber-800',
  pagado:    'bg-green-100 text-green-800',
  vencido:   'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-500',
}[e] || '');

export default function TabEstadoCuenta() {
  const [busqueda,    setBusqueda]    = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [alumno,      setAlumno]      = useState(null);
  const [cargos,      setCargos]      = useState([]);
  const [pagos,       setPagos]       = useState([]);
  const [cargando,    setCargando]    = useState(false);
  const [modal,       setModal]       = useState(false);
  const [cargoModal,  setCargoModal]  = useState(null);

  const buscar = async (q) => {
    setBusqueda(q);
    if (q.length < 2) { setSugerencias([]); return; }
    const res = await getAlumnos({ q });
    setSugerencias(res.slice(0, 8));
  };

  const seleccionar = useCallback(async (a) => {
    setAlumno(a); setSugerencias([]); setBusqueda('');
    setCargando(true);
    try {
      const [cs, ps] = await Promise.all([
        getCargos({ alumno_id: a.id }),
        getPagos({ alumno_id: a.id }),
      ]);
      setCargos(cs); setPagos(ps);
    } finally { setCargando(false); }
  }, []);

  const recargar = () => alumno && seleccionar(alumno);

  const pendiente = cargos.filter(c => c.estatus === 'pendiente').reduce((s, c) => s + parseFloat(c.monto), 0);
  const pagado    = pagos.reduce((s, p) => s + parseFloat(p.monto), 0);

  return (
    <div className="space-y-5">
      {/* Búsqueda */}
      <div className="relative max-w-md">
        <label className="text-xs font-medium text-gray-600">Buscar alumno</label>
        {alumno ? (
          <div className="mt-1 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-blue-800">{alumno.apellido_paterno} {alumno.nombre}</span>
            <button onClick={() => { setAlumno(null); setCargos([]); setPagos([]); }} className="ml-auto text-xs text-blue-500 hover:text-blue-700">✕ Cambiar</button>
          </div>
        ) : (
          <>
            <input value={busqueda} onChange={e => buscar(e.target.value)} placeholder="Nombre del alumno..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {sugerencias.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {sugerencias.map(a => (
                  <button key={a.id} onClick={() => seleccionar(a)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <span className="font-medium">{a.apellido_paterno} {a.nombre}</span>
                    {a.inscripcion_actual && <span className="text-gray-400 ml-2 text-xs">{a.inscripcion_actual.grado_nombre}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {alumno && !cargando && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xl font-bold text-amber-800">{fmt(pendiente)}</p>
              <p className="text-xs text-amber-600 mt-0.5">Saldo pendiente</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xl font-bold text-green-800">{fmt(pagado)}</p>
              <p className="text-xs text-green-600 mt-0.5">Total pagado</p>
            </div>
            <div className="flex items-center justify-center">
              <button onClick={() => { setCargoModal(null); setModal(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                + Registrar pago
              </button>
            </div>
          </div>

          {/* Cargos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700 text-sm">Cargos ({cargos.length})</h3>
            </div>
            {cargos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin cargos registrados</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Concepto</th>
                    <th className="px-4 py-2 text-left">Período</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                    <th className="px-4 py-2 text-left">Vencimiento</th>
                    <th className="px-4 py-2 text-left">Estatus</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cargos.map(c => (
                    <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{c.concepto_nombre}</td>
                      <td className="px-4 py-2 text-gray-500">{c.mes ? `${c.mes}/${c.anio}` : '—'}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(c.monto)}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {c.fecha_vencimiento ? new Date(c.fecha_vencimiento+'T00:00:00').toLocaleDateString('es-MX') : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${badgeCargo(c.estatus)}`}>{c.estatus}</span>
                      </td>
                      <td className="px-4 py-2">
                        {c.estatus === 'pendiente' && (
                          <button onClick={() => { setCargoModal(c); setModal(true); }}
                            className="text-xs text-blue-600 hover:underline">Cobrar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Historial de pagos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700 text-sm">Historial de pagos ({pagos.length})</h3>
            </div>
            {pagos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin pagos registrados</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                    <th className="px-4 py-2 text-left">Método</th>
                    <th className="px-4 py-2 text-left">Cajero</th>
                    <th className="px-4 py-2 text-left">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map(p => (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">{new Date(p.fecha_pago).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' })}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-800">{fmt(p.monto)}</td>
                      <td className="px-4 py-2 capitalize text-gray-600">{p.metodo}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{p.cajero_nombre || '—'}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{p.notas || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {modal && (
        <ModalPago
          alumnoPreseleccionado={alumno}
          cargoPreseleccionado={cargoModal}
          onClose={() => setModal(false)}
          onSuccess={() => { setModal(false); recargar(); }}
        />
      )}
    </div>
  );
}
