import { useState, useEffect } from 'react';
import { getNotificaciones, enviarNotificacion, enviarMasivo } from '../api/notificaciones';
import { getAlumnos } from '../api/controlEscolar';
import { getTutores } from '../api/controlEscolar';
import { getCiclos } from '../api/ciclos';

const TIPOS  = ['aviso','pago_vencido','pago_recibido','recordatorio'];
const CANALES = ['email','whatsapp','ambos'];

const fmt_fecha = (f) => new Date(f).toLocaleString('es-MX', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

const estadoBadge = (e) => ({ enviado:'bg-green-100 text-green-800', fallido:'bg-red-100 text-red-700', pendiente:'bg-amber-100 text-amber-700' }[e]||'');
const canalIcon   = (c) => ({ email:'✉️', whatsapp:'💬', ambos:'📲' }[c]||'📨');

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition ${active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      {label}
    </button>
  );
}

export default function NotificacionesPage() {
  const [tab, setTab] = useState('enviar');
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Comunicación con padres de familia</p>
      </div>
      <div className="border-b border-gray-200 mb-6 flex gap-1">
        {[['enviar','Enviar mensaje'],['masivo','Aviso masivo'],['historial','Historial']].map(([k,l]) =>
          <TabBtn key={k} label={l} active={tab===k} onClick={() => setTab(k)} />
        )}
      </div>
      {tab === 'enviar'   && <TabEnviar />}
      {tab === 'masivo'   && <TabMasivo />}
      {tab === 'historial'&& <TabHistorial />}
    </div>
  );
}

/* ─── Tab Enviar ──────────────────────────────────────────── */
function TabEnviar() {
  const [alumnos,     setAlumnos]     = useState([]);
  const [tutores,     setTutores]     = useState([]);
  const [busqueda,    setBusqueda]    = useState('');
  const [alumnoSelec, setAlumnoSelec] = useState(null);
  const [form, setForm] = useState({ tipo:'aviso', canal:'email', asunto:'', mensaje:'', destinatario:'', telefono:'' });
  const [saving,  setSaving]  = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error,     setError]     = useState('');
  const [wpUrl,     setWpUrl]     = useState('');

  const buscar = async (q) => {
    setBusqueda(q);
    if (q.length < 2) { setAlumnos([]); return; }
    getAlumnos({ q }).then(r => setAlumnos(r.slice(0,8)));
  };

  const seleccionarAlumno = async (a) => {
    setAlumnoSelec(a); setAlumnos([]); setBusqueda('');
    const ts = await getTutores(a.id);
    setTutores(ts);
    const resp = ts.find(t => t.es_responsable) || ts[0];
    if (resp) setForm(f => ({ ...f, destinatario: resp.email||'', telefono: resp.telefono||'' }));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const enviar = async () => {
    setError(''); setResultado(null); setWpUrl('');
    if (!alumnoSelec) return setError('Selecciona un alumno');
    if (!form.mensaje) return setError('Escribe el mensaje');
    setSaving(true);
    try {
      const tutor = tutores.find(t => t.email === form.destinatario || t.telefono === form.telefono);
      const res = await enviarNotificacion({
        alumno_id: alumnoSelec.id,
        tutor_id: tutor?.id || null,
        ...form,
      });
      const wp = res.find(r => r.whatsapp_url);
      if (wp) setWpUrl(wp.whatsapp_url);
      setResultado(res);
    } catch (err) { setError(err.response?.data?.error || 'Error al enviar'); }
    finally { setSaving(false); }
  };

  const PLANTILLAS = [
    { label:'Recordatorio de pago', asunto:'Recordatorio de pago pendiente', mensaje: `Estimado padre/madre de familia,\n\nLe recordamos que tiene un pago pendiente en GOKIDS.\n\nPor favor acérquese a caja o comuníquese con nosotros para regularizar su situación.\n\nGracias por su atención.` },
    { label:'Pago recibido',        asunto:'Confirmación de pago', mensaje: `Estimado padre/madre de familia,\n\nConfirmamos que hemos recibido su pago correctamente.\n\nGracias por mantenerse al corriente.\n\nAtentamente, GOKIDS.` },
    { label:'Aviso general',        asunto:'Aviso importante — GOKIDS', mensaje: `Estimado padre/madre de familia,\n\n[Escriba su mensaje aquí]\n\nAtentamente,\nDirectiva GOKIDS` },
  ];

  return (
    <div className="max-w-2xl space-y-5">
      {/* Búsqueda alumno */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">1. Seleccionar alumno</h3>
        <div className="relative">
          {alumnoSelec ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-indigo-800">{alumnoSelec.apellido_paterno} {alumnoSelec.nombre}</span>
              <button onClick={() => { setAlumnoSelec(null); setTutores([]); setForm(f => ({...f, destinatario:'', telefono:''})); }} className="ml-auto text-xs text-indigo-500">✕</button>
            </div>
          ) : (
            <>
              <input value={busqueda} onChange={e => buscar(e.target.value)} placeholder="Buscar alumno..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              {alumnos.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-44 overflow-y-auto">
                  {alumnos.map(a => (
                    <button key={a.id} onClick={() => seleccionarAlumno(a)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      {a.apellido_paterno} {a.nombre}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {tutores.length > 0 && (
          <div className="mt-3 space-y-2">
            {tutores.map(t => (
              <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                <input type="radio" name="tutor" onChange={() => setForm(f => ({...f, destinatario: t.email||'', telefono: t.telefono||''}))} />
                <span className="font-medium capitalize">{t.parentesco}</span> — {t.nombre}
                {t.email    && <span className="text-gray-400 text-xs">{t.email}</span>}
                {t.telefono && <span className="text-gray-400 text-xs">📱{t.telefono}</span>}
                {t.es_responsable && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 rounded">Responsable</span>}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Mensaje */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">2. Redactar mensaje</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {PLANTILLAS.map(p => (
            <button key={p.label} onClick={() => setForm(f => ({...f, asunto: p.asunto, mensaje: p.mensaje}))}
              className="text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50 text-gray-600">
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {TIPOS.map(t => <option key={t} value={t} className="capitalize">{t.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Canal</label>
            <select value={form.canal} onChange={e => set('canal', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {CANALES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
        </div>
        {(form.canal === 'email' || form.canal === 'ambos') && (
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600">Email destinatario</label>
            <input value={form.destinatario} onChange={e => set('destinatario', e.target.value)}
              placeholder="email@ejemplo.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        )}
        {(form.canal === 'whatsapp' || form.canal === 'ambos') && (
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600">Teléfono WhatsApp</label>
            <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
              placeholder="Ej. 4421234567"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        )}
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-600">Asunto (email)</label>
          <input value={form.asunto} onChange={e => set('asunto', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Mensaje *</label>
          <textarea value={form.mensaje} onChange={e => set('mensaje', e.target.value)} rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="mt-4 flex gap-3 justify-end">
          <button onClick={enviar} disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Enviando...' : 'Enviar notificación'}
          </button>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">Notificación procesada</p>
          {resultado.map((r, i) => (
            <p key={i} className="text-xs text-green-700">{canalIcon(r.canal)} {r.canal} → {r.destinatario} — {r.estatus}</p>
          ))}
          {wpUrl && (
            <a href={wpUrl} target="_blank" rel="noreferrer"
              className="inline-block mt-2 bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700">
              💬 Abrir WhatsApp para enviar
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Tab Masivo ──────────────────────────────────────────── */
function TabMasivo() {
  const [ciclos, setCiclos] = useState([]);
  const [form, setForm] = useState({ tipo:'pago_vencido', asunto:'Recordatorio de pago pendiente', mensaje: 'Estimado padre de familia,\n\nLe recordamos que {nombre} {apellido} tiene uno o más pagos pendientes en GOKIDS.\n\nPor favor acérquese a la administración a regularizar su situación.\n\nGracias,\nAdministración GOKIDS', ciclo_id:'' });
  const [saving,    setSaving]    = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error,     setError]     = useState('');

  useEffect(() => { getCiclos().then(cs => { setCiclos(cs); const a = cs.find(c => c.activo); if (a) setForm(f => ({...f, ciclo_id: String(a.id)})); }); }, []);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const enviar = async () => {
    setError(''); setResultado(null);
    if (!form.mensaje) return setError('Escribe el mensaje');
    setSaving(true);
    try { setResultado(await enviarMasivo(form)); }
    catch (err) { setError(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        Envía un email a todos los padres responsables que tengan cargos pendientes en el ciclo seleccionado. Usa <strong>{'{nombre}'}</strong>, <strong>{'{apellido}'}</strong>, <strong>{'{tutor}'}</strong> como variables.
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Ciclo escolar</label>
            <select value={form.ciclo_id} onChange={e => set('ciclo_id', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Todos los ciclos</option>
              {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.activo?' ✓':''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {TIPOS.map(t => <option key={t} value={t} className="capitalize">{t.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Asunto</label>
          <input value={form.asunto} onChange={e => set('asunto', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Mensaje</label>
          <textarea value={form.mensaje} onChange={e => set('mensaje', e.target.value)} rows={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-mono text-xs" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button onClick={enviar} disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Enviando...' : 'Enviar a todos'}
          </button>
        </div>
      </div>
      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-800 mb-1">Resultado del envío masivo</p>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[['Total','total'],['Enviados','enviados'],['Fallidos','fallidos'],['Sin email','sin_contacto']].map(([l,k]) => (
              <div key={k} className="bg-white rounded-lg p-2 border border-green-100">
                <p className="text-xl font-bold text-gray-800">{resultado[k]}</p>
                <p className="text-xs text-gray-500">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab Historial ────────────────────────────────────────── */
function TabHistorial() {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getNotificaciones().then(setNotifs).finally(() => setLoading(false)); }, []);

  return (
    <div>
      {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> :
       notifs.length === 0 ? <div className="p-12 text-center text-gray-400">Sin notificaciones enviadas</div> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Alumno</th>
                <th className="px-4 py-3 text-left">Canal</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Destinatario</th>
                <th className="px-4 py-3 text-left">Estatus</th>
              </tr>
            </thead>
            <tbody>
              {notifs.map(n => (
                <tr key={n.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 text-xs">{fmt_fecha(n.created_at)}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{n.apellido_paterno ? `${n.apellido_paterno} ${n.alumno_nombre}` : '—'}</td>
                  <td className="px-4 py-2">{canalIcon(n.canal)} <span className="text-gray-600 capitalize">{n.canal}</span></td>
                  <td className="px-4 py-2 text-gray-600 capitalize text-xs">{n.tipo?.replace('_',' ')}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs truncate max-w-32">{n.destinatario}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${estadoBadge(n.estatus)}`}>
                      {n.estatus}
                    </span>
                    {n.error_msg && <p className="text-xs text-red-500 mt-0.5">{n.error_msg}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
