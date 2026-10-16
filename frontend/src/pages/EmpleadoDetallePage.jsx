import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getEmpleado, subirFotoEmpleado, eliminarEmpleado,
  getTiposDocEmpleado, getDocumentosEmpleado, subirDocEmpleado, descargarDocEmpleado, eliminarDocEmpleado,
  getChecadasEmpleado,
  getNominaEmpleado
} from '../api/rh';

const fmt = (n) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n || 0);

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
        active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}>
      {label}
    </button>
  );
}

export default function EmpleadoDetallePage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [emp,     setEmp]     = useState(null);
  const [tab,     setTab]     = useState('documentos');
  const [loading, setLoading] = useState(true);
  const fotoRef = useRef();

  const cargar = async () => {
    try { setEmp(await getEmpleado(id)); }
    catch { navigate('/rh/empleados'); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, [id]);

  const subirFoto = async (e) => {
    if (!e.target.files[0]) return;
    await subirFotoEmpleado(id, e.target.files[0]);
    cargar();
  };

  const borrar = async () => {
    if (!confirm('¿Eliminar este empleado? Se borrarán todos sus datos.')) return;
    await eliminarEmpleado(id);
    navigate('/rh/empleados');
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando expediente...</div>;
  if (!emp) return null;

  const nombre_completo = `${emp.apellido_paterno} ${emp.apellido_materno||''} ${emp.nombre}`.trim();

  return (
    <div>
      {/* Cabecera */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="relative group cursor-pointer" onClick={() => fotoRef.current?.click()}>
            {emp.foto
              ? <img src={`http://localhost:3003${emp.foto}`} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-violet-100" />
              : <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-2xl border-2 border-violet-200">
                  {emp.nombre[0]}{emp.apellido_paterno[0]}
                </div>
            }
            <div className="absolute inset-0 rounded-full bg-black/30 hidden group-hover:flex items-center justify-center text-white text-xs">Cambiar</div>
            <input type="file" ref={fotoRef} accept="image/*" className="hidden" onChange={subirFoto} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{nombre_completo}</h1>
            <p className="text-sm text-gray-500 mt-1">{emp.puesto}{emp.departamento ? ` — ${emp.departamento}` : ''}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
              {emp.curp     && <span className="font-mono">{emp.curp}</span>}
              {emp.rfc      && <span>{emp.rfc}</span>}
              {emp.telefono && <span>{emp.telefono}</span>}
              {emp.email    && <span>{emp.email}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/rh/empleados/${id}/editar`)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">Editar</button>
            <button onClick={borrar}
              className="text-sm border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50">Eliminar</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 flex gap-1">
        {[['documentos','Documentos'],['checadas','Asistencia'],['nomina','Nómina']].map(([k,l]) =>
          <TabBtn key={k} label={l} active={tab===k} onClick={() => setTab(k)} />
        )}
      </div>

      {tab === 'documentos' && <TabDocumentos empleadoId={id} />}
      {tab === 'checadas'   && <TabChecadas   empleadoId={id} />}
      {tab === 'nomina'     && <TabNomina     empleadoId={id} />}
    </div>
  );
}

/* ─── Tab Documentos ─────────────────────────────────────── */
function TabDocumentos({ empleadoId }) {
  const [tipos,  setTipos]  = useState([]);
  const [docs,   setDocs]   = useState([]);
  const [subiendo, setSub]  = useState(null);

  const cargar = () => {
    getTiposDocEmpleado().then(setTipos);
    getDocumentosEmpleado(empleadoId).then(setDocs);
  };
  useEffect(() => { cargar(); }, [empleadoId]);

  const docDeTipo = (tid) => docs.find(d => d.tipo_documento_id === tid);

  const subir = async (tid, file) => {
    setSub(tid);
    try { await subirDocEmpleado(empleadoId, tid, file); cargar(); }
    catch {} finally { setSub(null); }
  };

  const borrar = async (did) => {
    if (!confirm('¿Eliminar documento?')) return;
    await eliminarDocEmpleado(did); cargar();
  };

  const pendientes = tipos.filter(t => t.requerido && !docDeTipo(t.id)).length;

  return (
    <div>
      {pendientes > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2">
          {pendientes} documento{pendientes>1?'s':''} requerido{pendientes>1?'s':''} pendiente{pendientes>1?'s':''}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y">
        {tipos.map(tipo => {
          const doc = docDeTipo(tipo.id);
          return (
            <div key={tipo.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${doc ? 'bg-green-400' : tipo.requerido ? 'bg-amber-400' : 'bg-gray-200'}`} />
                <span className="text-sm font-medium text-gray-800">{tipo.nombre}</span>
                {tipo.requerido && !doc && <span className="text-xs text-amber-600">Requerido</span>}
                {doc && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Completo</span>}
              </div>
              <div className="flex items-center gap-2">
                {doc && (
                  <button onClick={() => descargarDocEmpleado(doc.id, doc.filename)}
                    className="text-xs text-blue-600 hover:underline truncate max-w-40">{doc.filename}</button>
                )}
                <label className="cursor-pointer text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">
                  {doc ? 'Reemplazar' : 'Subir'}
                  <input type="file" className="hidden" disabled={subiendo===tipo.id}
                    onChange={e => e.target.files[0] && subir(tipo.id, e.target.files[0])} />
                </label>
                {doc && (
                  <button onClick={() => borrar(doc.id)} className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50">✕</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Tab Checadas ───────────────────────────────────────── */
function TabChecadas({ empleadoId }) {
  const [checadas, setChecadas] = useState([]);
  const [desde,    setDesde]    = useState('');
  const [hasta,    setHasta]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const cargar = async () => {
    setLoading(true);
    try { setChecadas(await getChecadasEmpleado(empleadoId, { desde: desde||undefined, hasta: hasta||undefined })); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, [empleadoId]);

  const tipoBadge = (t) => ({ entrada:'bg-green-100 text-green-800', salida:'bg-blue-100 text-blue-800', desconocido:'bg-gray-100 text-gray-600' }[t]||'');

  return (
    <div>
      <div className="flex gap-3 mb-4 items-end flex-wrap">
        <div>
          <label className="text-xs text-gray-500">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="block border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="block border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button onClick={cargar} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Filtrar</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-400 text-sm">Cargando...</div> :
         checadas.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">Sin registros de asistencia</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Fecha y hora</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {checadas.map(c => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">
                    {new Date(c.timestamp).toLocaleString('es-MX', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${tipoBadge(c.tipo)}`}>{c.tipo}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{c.dispositivo_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Tab Nómina ─────────────────────────────────────────── */
function TabNomina({ empleadoId }) {
  const [pagos, setPagos] = useState([]);
  useEffect(() => { getNominaEmpleado(empleadoId).then(setPagos).catch(() => {}); }, [empleadoId]);

  const total = pagos.reduce((s, p) => s + parseFloat(p.monto||0), 0);

  return (
    <div>
      {pagos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Sin registros de nómina. Importa un PDF desde la sección <strong>Nómina</strong>.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Semana</th>
                <th className="px-4 py-3 text-left">Año</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-left">Cuenta</th>
                <th className="px-4 py-3 text-left">Estatus</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">Semana {p.semana}</td>
                  <td className="px-4 py-3 text-gray-500">{p.anio}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(p.monto)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.cuenta||'—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.autorizado||'—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Total acumulado</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
