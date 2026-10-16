import { useState, useEffect } from 'react';
import { getCiclos }     from '../../api/ciclos';
import { getConceptos, getCargos, crearCargo, crearCargoMasivo } from '../../api/cobranza';
import { getAlumnos }    from '../../api/controlEscolar';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fmt = (n) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n || 0);

export default function TabCargos() {
  const [ciclos,    setCiclos]    = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [cicloId,   setCicloId]   = useState('');
  const [tab,       setTab]       = useState('masivo');
  const [cargos,    setCargosLista] = useState([]);
  const [cargando,  setCargando]  = useState(false);

  // Formulario masivo
  const [fMasivo, setFMasivo] = useState({ concepto_id:'', mes: new Date().getMonth()+1, anio: new Date().getFullYear(), fecha_vencimiento:'' });
  const [saving,  setSaving]  = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error,   setError]   = useState('');

  // Formulario individual
  const [alumnos,     setAlumnos]     = useState([]);
  const [busqueda,    setBusqueda]    = useState('');
  const [alumnoSelec, setAlumnoSelec] = useState(null);
  const [fIndiv, setFIndiv] = useState({ concepto_id:'', monto:'', mes:'', anio: new Date().getFullYear(), descripcion:'', fecha_vencimiento:'' });

  useEffect(() => {
    getCiclos().then(cs => {
      setCiclos(cs);
      const a = cs.find(c => c.activo);
      if (a) setCicloId(String(a.id));
    });
    getConceptos(true).then(setConceptos);
  }, []);

  useEffect(() => {
    if (!cicloId) return;
    setCargando(true);
    getCargos({ ciclo_id: cicloId }).then(setCargosLista).finally(() => setCargando(false));
  }, [cicloId]);

  const setM = (k, v) => setFMasivo(f => ({ ...f, [k]: v }));
  const setI = (k, v) => setFIndiv(f => ({ ...f, [k]: v }));

  const generarMasivo = async () => {
    setError(''); setMensaje('');
    if (!fMasivo.concepto_id || !cicloId) return setError('Selecciona ciclo y concepto');
    setSaving(true);
    try {
      const res = await crearCargoMasivo({ ...fMasivo, ciclo_id: cicloId });
      setMensaje(`✓ Se generaron ${res.creados} cargos de ${res.total_alumnos} alumnos activos (${res.total_alumnos - res.creados} ya existían)`);
      getCargos({ ciclo_id: cicloId }).then(setCargosLista);
    } catch (err) { setError(err.response?.data?.error || 'Error al generar cargos'); }
    finally { setSaving(false); }
  };

  const buscarAlumnos = async (q) => {
    setBusqueda(q);
    if (q.length < 2) { setAlumnos([]); return; }
    getAlumnos({ q, estatus:'activo' }).then(r => setAlumnos(r.slice(0,8)));
  };

  const seleccionarAlumno = (a) => {
    setAlumnoSelec(a); setAlumnos([]); setBusqueda('');
    const cp = conceptos.find(c => String(c.id) === String(fIndiv.concepto_id));
    if (cp) setI('monto', cp.monto);
  };

  const guardarIndiv = async () => {
    setError(''); setMensaje('');
    if (!alumnoSelec || !fIndiv.concepto_id || !fIndiv.monto) return setError('Selecciona alumno, concepto y monto');
    setSaving(true);
    try {
      await crearCargo({ alumno_id: alumnoSelec.id, ciclo_id: cicloId||null, ...fIndiv });
      setMensaje('✓ Cargo creado correctamente');
      getCargos({ ciclo_id: cicloId }).then(setCargosLista);
      setAlumnoSelec(null); setFIndiv({ concepto_id:'', monto:'', mes:'', anio: new Date().getFullYear(), descripcion:'', fecha_vencimiento:'' });
    } catch (err) { setError(err.response?.data?.error || 'Error al crear cargo'); }
    finally { setSaving(false); }
  };

  const estatusBadge = (e) => ({ pendiente:'bg-amber-100 text-amber-800', pagado:'bg-green-100 text-green-800', vencido:'bg-red-100 text-red-800', cancelado:'bg-gray-100 text-gray-500' }[e]||'');

  return (
    <div className="space-y-5">
      {/* Ciclo selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="text-xs font-medium text-gray-600 mr-2">Ciclo escolar:</label>
          <select value={cicloId} onChange={e => setCicloId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">— Seleccionar —</option>
            {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' ✓' : ''}</option>)}
          </select>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {['masivo','individual'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 capitalize ${tab===t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {t === 'masivo' ? 'Cargo masivo' : 'Cargo individual'}
            </button>
          ))}
        </div>
      </div>

      {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {mensaje && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{mensaje}</p>}

      {/* Formulario masivo */}
      {tab === 'masivo' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Generar cargo mensual para todos los alumnos del ciclo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Concepto *</label>
              <select value={fMasivo.concepto_id} onChange={e => setM('concepto_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">— Seleccionar —</option>
                {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre} — {fmt(c.monto)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Mes</label>
              <select value={fMasivo.mes} onChange={e => setM('mes', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400">
                {MESES.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Año</label>
              <input type="number" value={fMasivo.anio} onChange={e => setM('anio', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Fecha vencimiento</label>
              <input type="date" value={fMasivo.fecha_vencimiento} onChange={e => setM('fecha_vencimiento', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={generarMasivo} disabled={saving || !cicloId}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Generando...' : 'Generar cargos'}
            </button>
          </div>
        </div>
      )}

      {/* Formulario individual */}
      {tab === 'individual' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Agregar cargo a un alumno específico</h3>
          <div className="space-y-3">
            <div className="relative">
              <label className="text-xs font-medium text-gray-600">Alumno *</label>
              {alumnoSelec ? (
                <div className="mt-1 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-blue-800">{alumnoSelec.apellido_paterno} {alumnoSelec.nombre}</span>
                  <button onClick={() => setAlumnoSelec(null)} className="ml-auto text-xs text-blue-500">✕</button>
                </div>
              ) : (
                <>
                  <input value={busqueda} onChange={e => buscarAlumnos(e.target.value)} placeholder="Buscar alumno..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  {alumnos.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {alumnos.map(a => (
                        <button key={a.id} onClick={() => seleccionarAlumno(a)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                          {a.apellido_paterno} {a.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Concepto *</label>
                <select value={fIndiv.concepto_id} onChange={e => { setI('concepto_id', e.target.value); const cp = conceptos.find(c => String(c.id) === e.target.value); if (cp) setI('monto', cp.monto); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">— Seleccionar —</option>
                  {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Monto *</label>
                <input type="number" value={fIndiv.monto} onChange={e => setI('monto', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Mes / Año</label>
                <div className="flex gap-1 mt-1">
                  <select value={fIndiv.mes} onChange={e => setI('mes', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">—</option>
                    {MESES.map((m,i) => <option key={i+1} value={i+1}>{m.slice(0,3)}</option>)}
                  </select>
                  <input type="number" value={fIndiv.anio} onChange={e => setI('anio', e.target.value)}
                    className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={guardarIndiv} disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Crear cargo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de cargos del ciclo */}
      {cicloId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">Cargos del ciclo ({cargos.length})</h3>
          </div>
          {cargando ? <div className="p-6 text-center text-gray-400 text-sm">Cargando...</div> :
           cargos.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">Sin cargos en este ciclo</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Alumno</th>
                    <th className="px-4 py-2 text-left">Concepto</th>
                    <th className="px-4 py-2 text-left">Período</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                    <th className="px-4 py-2 text-left">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {cargos.map(c => (
                    <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{c.apellido_paterno} {c.alumno_nombre}</td>
                      <td className="px-4 py-2 text-gray-600">{c.concepto_nombre}</td>
                      <td className="px-4 py-2 text-gray-500">{c.mes ? `${MESES[c.mes-1]} ${c.anio}` : '—'}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(c.monto)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${estatusBadge(c.estatus)}`}>{c.estatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
