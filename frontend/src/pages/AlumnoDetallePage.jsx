import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAlumno, subirFotoAlumno, eliminarAlumno,
  getTutores, crearTutor, updateTutor, eliminarTutor,
  getInscripciones, crearInscripcion,
  getTiposDocumento, getDocumentosAlumno, subirDocumento, eliminarDocumento
} from '../api/controlEscolar';
import { getGrupos } from '../api/controlEscolar';
import { getCiclos } from '../api/ciclos';

const PARENTESCOS = ['madre','padre','abuelo','abuela','tío','tía','tutor legal','otro'];

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

export default function AlumnoDetallePage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [alumno, setAlumno] = useState(null);
  const [tab, setTab]       = useState('datos');
  const [loading, setLoading] = useState(true);
  const fotoRef = useRef();

  const cargar = async () => {
    try { setAlumno(await getAlumno(id)); }
    catch { navigate('/control-escolar/alumnos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [id]);

  const subirFoto = async (e) => {
    if (!e.target.files[0]) return;
    await subirFotoAlumno(id, e.target.files[0]);
    cargar();
  };

  const borrar = async () => {
    if (!confirm('¿Eliminar este alumno permanentemente? Se borrarán todos sus datos.')) return;
    await eliminarAlumno(id);
    navigate('/control-escolar/alumnos');
  };

  const calcularEdad = (fecha) => {
    if (!fecha) return '—';
    const hoy = new Date();
    const nac = new Date(fecha + 'T00:00:00');
    let e = hoy.getFullYear() - nac.getFullYear();
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--;
    return `${e} años`;
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando expediente...</div>;
  if (!alumno) return null;

  const nombre_completo = `${alumno.apellido_paterno} ${alumno.apellido_materno || ''} ${alumno.nombre}`.trim();

  return (
    <div>
      {/* Cabecera del alumno */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="relative group cursor-pointer" onClick={() => fotoRef.current?.click()}>
            {alumno.foto
              ? <img src={`http://localhost:3003${alumno.foto}`} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-blue-100" />
              : <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl border-2 border-blue-200">
                  {alumno.nombre[0]}{alumno.apellido_paterno[0]}
                </div>
            }
            <div className="absolute inset-0 rounded-full bg-black/30 hidden group-hover:flex items-center justify-center text-white text-xs">
              Cambiar
            </div>
            <input type="file" ref={fotoRef} accept="image/*" className="hidden" onChange={subirFoto} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{nombre_completo}</h1>
            <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
              <span>{calcularEdad(alumno.fecha_nacimiento)}</span>
              {alumno.curp && <span className="font-mono">{alumno.curp}</span>}
              {alumno.sexo && <span className="capitalize">{alumno.sexo}</span>}
            </div>
            {alumno.inscripcion_actual && (
              <p className="mt-2 text-sm text-blue-700 font-medium">
                {alumno.inscripcion_actual.grado_nombre} — Grupo {alumno.inscripcion_actual.grupo_nombre}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/control-escolar/alumnos/${id}/editar`)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              Editar
            </button>
            <button onClick={borrar}
              className="text-sm border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50">
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 flex gap-1">
        {[
          ['datos',         'Datos personales'],
          ['tutores',       'Tutores / Padres'],
          ['inscripcion',   'Inscripción'],
          ['documentos',    'Documentos'],
        ].map(([k, l]) => <TabBtn key={k} label={l} active={tab===k} onClick={() => setTab(k)} />)}
      </div>

      {tab === 'datos'       && <TabDatos alumno={alumno} />}
      {tab === 'tutores'     && <TabTutores alumnoId={id} />}
      {tab === 'inscripcion' && <TabInscripcion alumnoId={id} onReload={cargar} />}
      {tab === 'documentos'  && <TabDocumentos alumnoId={id} />}
    </div>
  );
}

/* ─── Tab Datos ─────────────────────────────────────────────── */
function TabDatos({ alumno }) {
  const fila = (label, value) => value ? (
    <div key={label} className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
      <dt className="w-44 text-xs text-gray-500 font-medium pt-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 flex-1">{value}</dd>
    </div>
  ) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <dl>
        {fila('Nombre completo', `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno||''}`)}
        {fila('Fecha de nacimiento', alumno.fecha_nacimiento ? new Date(alumno.fecha_nacimiento+'T00:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}) : null)}
        {fila('CURP', alumno.curp)}
        {fila('Sexo', alumno.sexo)}
        {fila('Tipo de sangre', alumno.tipo_sangre)}
        {fila('Dirección', alumno.direccion)}
        {fila('Alergias', alumno.alergias)}
        {fila('Condiciones médicas', alumno.condiciones_medicas)}
        {fila('Observaciones', alumno.observaciones)}
        {fila('Estatus', alumno.estatus)}
      </dl>
    </div>
  );
}

/* ─── Tab Tutores ────────────────────────────────────────────── */
function TabTutores({ alumnoId }) {
  const [tutores, setTutores] = useState([]);
  const [modal,   setModal]   = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre:'', parentesco:'madre', telefono:'', telefono_trabajo:'', email:'', ocupacion:'', es_responsable:false });
  const [saving, setSaving] = useState(false);

  const cargar = () => getTutores(alumnoId).then(setTutores);
  useEffect(() => { cargar(); }, [alumnoId]);

  const abrir = (t = null) => {
    if (t) {
      setEditando(t.id);
      setForm({ nombre:t.nombre||'', parentesco:t.parentesco||'madre', telefono:t.telefono||'', telefono_trabajo:t.telefono_trabajo||'', email:t.email||'', ocupacion:t.ocupacion||'', es_responsable:t.es_responsable||false });
    } else {
      setEditando(null);
      setForm({ nombre:'', parentesco:'madre', telefono:'', telefono_trabajo:'', email:'', ocupacion:'', es_responsable:false });
    }
    setModal(true);
  };

  const guardar = async () => {
    setSaving(true);
    try {
      if (editando) await updateTutor(editando, form);
      else await crearTutor({ ...form, alumno_id: alumnoId });
      cargar(); setModal(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const borrar = async (tid) => {
    if (!confirm('¿Eliminar este tutor?')) return;
    await eliminarTutor(tid);
    cargar();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-gray-700">Tutores / Padres de familia</h2>
        <button onClick={() => abrir()} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">+ Agregar</button>
      </div>
      <div className="space-y-3">
        {tutores.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No hay tutores registrados</p>}
        {tutores.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-800">{t.nombre}</p>
                <span className="text-xs text-gray-500 capitalize">{t.parentesco}</span>
                {t.es_responsable && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Responsable</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                {t.telefono       && <p>Tel. {t.telefono}</p>}
                {t.telefono_trabajo && <p>Trabajo: {t.telefono_trabajo}</p>}
                {t.email          && <p>{t.email}</p>}
                {t.ocupacion      && <p>{t.ocupacion}</p>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => abrir(t)} className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">Editar</button>
              <button onClick={() => borrar(t.id)} className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50">Borrar</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">{editando ? 'Editar tutor' : 'Agregar tutor'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nombre completo *</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Parentesco</label>
                  <select value={form.parentesco} onChange={e => set('parentesco', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {PARENTESCOS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Teléfono</label>
                  <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Tel. trabajo</label>
                  <input value={form.telefono_trabajo} onChange={e => set('telefono_trabajo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Ocupación</label>
                <input value={form.ocupacion} onChange={e => set('ocupacion', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.es_responsable} onChange={e => set('es_responsable', e.target.checked)} className="rounded" />
                Es el responsable principal del alumno
              </label>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab Inscripción ─────────────────────────────────────────── */
function TabInscripcion({ alumnoId, onReload }) {
  const [inscripciones, setInscripciones] = useState([]);
  const [ciclos, setCiclos]   = useState([]);
  const [grupos, setGrupos]   = useState([]);
  const [form, setForm]       = useState({ ciclo_id:'', grupo_id:'' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    getInscripciones({ alumno_id: alumnoId }).then(setInscripciones);
    getCiclos().then(setCiclos);
  }, [alumnoId]);

  useEffect(() => {
    if (form.ciclo_id) getGrupos(form.ciclo_id).then(setGrupos);
    else setGrupos([]);
  }, [form.ciclo_id]);

  const inscribir = async () => {
    if (!form.ciclo_id || !form.grupo_id) return setError('Selecciona ciclo y grupo');
    setSaving(true); setError('');
    try {
      await crearInscripcion({ alumno_id: alumnoId, ...form });
      getInscripciones({ alumno_id: alumnoId }).then(setInscripciones);
      onReload();
      setForm({ ciclo_id:'', grupo_id:'' });
    } catch (err) { setError(err.response?.data?.error || 'Error al inscribir'); }
    finally { setSaving(false); }
  };

  const badgeEstatus = (e) => ({ activo:'bg-green-100 text-green-800', baja:'bg-red-100 text-red-700', egresado:'bg-blue-100 text-blue-800' }[e] || '');

  return (
    <div>
      <h2 className="font-semibold text-gray-700 mb-4">Historial de inscripciones</h2>
      <div className="space-y-3 mb-6">
        {inscripciones.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Sin inscripciones registradas</p>}
        {inscripciones.map(i => (
          <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{i.ciclo_nombre}</p>
              <p className="text-sm text-gray-500">{i.grado_nombre} — Grupo {i.grupo_nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">Inscrito: {new Date(i.fecha_inscripcion+'T00:00:00').toLocaleDateString('es-MX')}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${badgeEstatus(i.estatus)}`}>{i.estatus}</span>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
        <h3 className="font-semibold text-blue-800 mb-3 text-sm">Nueva inscripción</h3>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-blue-700">Ciclo escolar</label>
            <select value={form.ciclo_id} onChange={e => setForm(f => ({ ...f, ciclo_id: e.target.value, grupo_id:'' }))}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              <option value="">— Seleccionar —</option>
              {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' ✓' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-blue-700">Grupo</label>
            <select value={form.grupo_id} onChange={e => setForm(f => ({ ...f, grupo_id: e.target.value }))}
              disabled={!form.ciclo_id}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white disabled:opacity-50">
              <option value="">— Seleccionar —</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.grado_nombre} — {g.nombre} ({g.inscritos}/{g.capacidad})</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={inscribir} disabled={saving}
            className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Inscribiendo...' : 'Inscribir al alumno'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Documentos ──────────────────────────────────────────── */
function TabDocumentos({ alumnoId }) {
  const [tipos, setTipos]       = useState([]);
  const [docs,  setDocs]        = useState([]);
  const [subiendo, setSubiendo] = useState(null);

  const cargar = () => {
    getTiposDocumento().then(setTipos);
    getDocumentosAlumno(alumnoId).then(setDocs);
  };
  useEffect(() => { cargar(); }, [alumnoId]);

  const docDeDoc = (tipo_id) => docs.find(d => d.tipo_id === tipo_id);

  const handleUpload = async (tipo_id, file) => {
    setSubiendo(tipo_id);
    try { await subirDocumento(alumnoId, tipo_id, file); cargar(); }
    catch { /* ignore */ }
    finally { setSubiendo(null); }
  };

  const handleDelete = async (doc_id) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await eliminarDocumento(doc_id);
    cargar();
  };

  return (
    <div>
      <h2 className="font-semibold text-gray-700 mb-4">Documentos del expediente</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tipos.map(tipo => {
          const doc = docDeDoc(tipo.id);
          return (
            <div key={tipo.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${doc ? 'border-green-200' : tipo.requerido ? 'border-amber-200' : 'border-gray-200'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${doc ? 'bg-green-100 text-green-700' : tipo.requerido ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                {doc ? '✓' : tipo.requerido ? '!' : '○'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{tipo.nombre}</p>
                {doc ? (
                  <a href={`http://localhost:3003${doc.ruta}`} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate block">
                    {doc.filename}
                  </a>
                ) : (
                  <p className="text-xs text-gray-400">{tipo.requerido ? 'Requerido' : 'Opcional'}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <label className="cursor-pointer text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">
                  {doc ? 'Reemplazar' : 'Subir'}
                  <input type="file" className="hidden"
                    disabled={subiendo === tipo.id}
                    onChange={e => e.target.files[0] && handleUpload(tipo.id, e.target.files[0])} />
                </label>
                {doc && (
                  <button onClick={() => handleDelete(doc.id)}
                    className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50">
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
