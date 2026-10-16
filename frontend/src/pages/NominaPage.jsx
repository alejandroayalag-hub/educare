import { useState, useEffect } from 'react';
import { getNominaSemanas, getNominaSemana, parsearNomina, importarNomina, descargarSemana, eliminarSemana, getEmpleados } from '../api/rh';

const fmt = (n) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n || 0);

export default function NominaPage() {
  const [semanas,   setSemanas]   = useState([]);
  const [tab,       setTab]       = useState('historial');
  const [archivo,   setArchivo]   = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [semana,    setSemana]    = useState('');
  const [anio,      setAnio]      = useState(new Date().getFullYear());
  const [parsing,   setParsing]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [error,     setError]     = useState('');
  const [msg,       setMsg]       = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [detalle,   setDetalle]   = useState(null);

  useEffect(() => {
    getNominaSemanas().then(setSemanas);
    getEmpleados({ estatus: 'activo' }).then(setEmpleados);
  }, []);

  const parsear = async () => {
    if (!archivo) return setError('Selecciona un archivo PDF');
    setError(''); setParsing(true); setPreview(null);
    try {
      const res = await parsearNomina(archivo);
      setPreview(res.preview);
    } catch (err) { setError(err.response?.data?.error || 'Error al procesar PDF'); }
    finally { setParsing(false); }
  };

  const asignarEmpleado = (idx, empleado_id) => {
    setPreview(prev => prev.map((r, i) => i === idx ? { ...r, empleado_id: empleado_id ? parseInt(empleado_id) : null } : r));
  };

  const importar = async () => {
    if (!semana || !anio) return setError('Ingresa semana y año');
    setError(''); setImporting(true);
    try {
      await importarNomina(archivo, semana, anio, preview);
      setMsg(`✓ Semana ${semana}/${anio} importada correctamente`);
      setPreview(null); setArchivo(null); setSemana('');
      getNominaSemanas().then(setSemanas);
      setTab('historial');
    } catch (err) { setError(err.response?.data?.error || 'Error al importar'); }
    finally { setImporting(false); }
  };

  const borrarSemana = async (id) => {
    if (!confirm('¿Eliminar esta semana de nómina?')) return;
    await eliminarSemana(id);
    setSemanas(ss => ss.filter(s => s.id !== id));
    if (detalle?.id === id) setDetalle(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Nómina</h1>
        <p className="text-sm text-gray-500 mt-1">Importa comprobantes PDF de pago de nómina</p>
      </div>

      <div className="border-b border-gray-200 mb-6 flex gap-1">
        {[['historial','Historial'],['importar','Importar PDF']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab===k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
      {msg   && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{msg}</p>}

      {/* Historial */}
      {tab === 'historial' && (
        <div className="space-y-4">
          {semanas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
              <p className="text-3xl mb-3">📄</p>
              <p>No hay semanas importadas</p>
              <button onClick={() => setTab('importar')} className="mt-3 text-blue-600 hover:underline text-sm">Importar primer PDF →</button>
            </div>
          ) : semanas.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-semibold text-gray-800">Semana {s.semana} — {s.anio}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.total_registros} registros · {new Date(s.created_at).toLocaleDateString('es-MX')}</p>
                </div>
                <div className="flex gap-2">
                  <DetalleBtn semanaId={s.id} empleados={empleados} />
                  <button onClick={() => descargarSemana(s.id, s.filename)}
                    className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">Descargar PDF</button>
                  <button onClick={() => borrarSemana(s.id)}
                    className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Importar */}
      {tab === 'importar' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">1. Cargar archivo PDF</h3>
            <div className="flex gap-3 items-center flex-wrap">
              <label className={`cursor-pointer border-2 border-dashed rounded-xl px-6 py-4 text-center text-sm ${archivo ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400 hover:border-blue-200'}`}>
                {archivo ? `📄 ${archivo.name}` : '📁 Seleccionar PDF de nómina'}
                <input type="file" accept=".pdf" className="hidden" onChange={e => { setArchivo(e.target.files[0]); setPreview(null); }} />
              </label>
              <button onClick={parsear} disabled={!archivo || parsing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {parsing ? 'Procesando...' : 'Procesar PDF'}
              </button>
            </div>
          </div>

          {preview && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4 text-sm">2. Verificar y asignar empleados ({preview.length} registros)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Nombre en PDF</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                        <th className="px-3 py-2 text-left">Empleado asignado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className={`border-t border-gray-100 ${r.empleado_id ? '' : 'bg-amber-50'}`}>
                          <td className="px-3 py-2 text-gray-700">{r.nombre_pdf}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(r.monto)}</td>
                          <td className="px-3 py-2">
                            <select value={r.empleado_id || ''} onChange={e => asignarEmpleado(i, e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                              <option value="">— Sin asignar —</option>
                              {empleados.map(e => <option key={e.id} value={e.id}>{e.apellido_paterno} {e.nombre}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td className="px-3 py-2 text-sm font-semibold text-gray-700">Total</td>
                        <td className="px-3 py-2 text-right font-bold text-green-700">{fmt(preview.reduce((s,r) => s+parseFloat(r.monto||0), 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4 text-sm">3. Guardar semana</h3>
                <div className="flex gap-3 items-end flex-wrap">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Semana del año *</label>
                    <input type="number" min="1" max="53" value={semana} onChange={e => setSemana(e.target.value)}
                      placeholder="Ej. 18"
                      className="block border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 w-28 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Año *</label>
                    <input type="number" value={anio} onChange={e => setAnio(e.target.value)}
                      className="block border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 w-24 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <button onClick={importar} disabled={importing}
                    className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    {importing ? 'Importando...' : 'Importar nómina'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DetalleBtn({ semanaId, empleados }) {
  const [open,    setOpen]    = useState(false);
  const [pagos,   setPagos]   = useState([]);
  const [loading, setLoading] = useState(false);

  const abrir = async () => {
    if (open) return setOpen(false);
    setLoading(true);
    try { setPagos(await getNominaSemana(semanaId)); } catch {} finally { setLoading(false); }
    setOpen(true);
  };

  return (
    <>
      <button onClick={abrir} className="text-xs text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50">
        {open ? 'Ocultar' : 'Ver detalle'}
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between">
              <h3 className="font-semibold text-gray-800">Detalle de nómina</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Nombre en PDF</th>
                  <th className="px-4 py-2 text-left">Empleado</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map(p => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-600">{p.nombre_pdf}</td>
                    <td className="px-4 py-2 text-gray-800">{p.apellido_paterno ? `${p.apellido_paterno} ${p.nombre}` : <span className="text-gray-400 text-xs">Sin asignar</span>}</td>
                    <td className="px-4 py-2 text-right font-semibold text-green-700">{new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(p.monto||0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
