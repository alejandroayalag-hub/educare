import { useState, useEffect } from 'react';
import { getCiclos } from '../api/ciclos';
import { getGrados, getGrupos, crearGrupo, updateGrupo, eliminarGrupo } from '../api/controlEscolar';
import { getUsuarios } from '../api/usuarios';

export default function GruposPage() {
  const [ciclos,   setCiclos]   = useState([]);
  const [grados,   setGrados]   = useState([]);
  const [maestros, setMaestros] = useState([]);
  const [grupos,   setGrupos]   = useState([]);
  const [cicloId,  setCicloId]  = useState('');
  const [modal,    setModal]    = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre:'', grado_id:'', ciclo_id:'', maestro_id:'', capacidad:20 });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    getCiclos().then(cs => {
      setCiclos(cs);
      const activo = cs.find(c => c.activo);
      if (activo) setCicloId(String(activo.id));
    });
    getGrados().then(setGrados);
    getUsuarios().then(us => setMaestros(us.filter(u => u.rol === 'maestro')));
  }, []);

  useEffect(() => {
    if (cicloId) getGrupos(cicloId).then(setGrupos);
    else setGrupos([]);
  }, [cicloId]);

  const cargar = () => { if (cicloId) getGrupos(cicloId).then(setGrupos); };

  const abrir = (g = null) => {
    if (g) {
      setEditando(g.id);
      setForm({ nombre: g.nombre, grado_id: String(g.grado_id), ciclo_id: String(g.ciclo_id), maestro_id: String(g.maestro_id||''), capacidad: g.capacidad });
    } else {
      setEditando(null);
      setForm({ nombre: '', grado_id: '', ciclo_id: cicloId, maestro_id: '', capacidad: 20 });
    }
    setError('');
    setModal(true);
  };

  const guardar = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, grado_id: Number(form.grado_id), ciclo_id: Number(form.ciclo_id), maestro_id: form.maestro_id ? Number(form.maestro_id) : null, capacidad: Number(form.capacidad) };
      if (editando) await updateGrupo(editando, payload);
      else await crearGrupo(payload);
      cargar(); setModal(false);
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const borrar = async (id) => {
    if (!confirm('¿Eliminar este grupo?')) return;
    await eliminarGrupo(id);
    cargar();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const gradoOrden = grados.reduce((acc, g) => { acc[g.id] = g.orden; return acc; }, {});
  const agrupadosPorGrado = grupos.reduce((acc, g) => {
    const key = g.grado_nombre;
    if (!acc[key]) acc[key] = { orden: gradoOrden[g.grado_id] || 99, grupos: [] };
    acc[key].grupos.push(g);
    return acc;
  }, {});
  const gradosOrdenados = Object.entries(agrupadosPorGrado).sort((a,b) => a[1].orden - b[1].orden);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Grupos</h1>
        <button onClick={() => abrir()} disabled={!cicloId}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
          + Nuevo grupo
        </button>
      </div>

      <div className="mb-6">
        <label className="text-xs font-medium text-gray-600 mr-2">Ciclo escolar:</label>
        <select value={cicloId} onChange={e => setCicloId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">— Seleccionar —</option>
          {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' ✓ activo' : ''}</option>)}
        </select>
      </div>

      {!cicloId && <p className="text-sm text-gray-400 text-center py-12">Selecciona un ciclo escolar para ver sus grupos</p>}

      {cicloId && grupos.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm">No hay grupos en este ciclo</p>
          <button onClick={() => abrir()} className="mt-3 text-sm text-indigo-600 hover:underline">Crear el primer grupo</button>
        </div>
      )}

      {gradosOrdenados.map(([grado, { grupos: gs }]) => (
        <div key={grado} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">{grado}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {gs.map(g => (
              <div key={g.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">Grupo {g.nombre}</p>
                    <p className="text-sm text-gray-500">{g.grado_nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{g.inscritos}</p>
                    <p className="text-xs text-gray-400">de {g.capacidad}</p>
                  </div>
                </div>
                {g.maestro_nombre && (
                  <p className="text-xs text-gray-500 mt-2">Maestra/o: {g.maestro_nombre}</p>
                )}
                <div className="mt-3 h-1.5 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-indigo-400 transition-all"
                    style={{ width: `${Math.min(100, (g.inscritos / g.capacidad) * 100)}%` }} />
                </div>
                <div className="flex gap-2 mt-3 justify-end">
                  <button onClick={() => abrir(g)} className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">Editar</button>
                  <button onClick={() => borrar(g.id)} className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50">Borrar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">{editando ? 'Editar grupo' : 'Nuevo grupo'}</h3>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Nombre del grupo *</label>
                  <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                    placeholder="Ej. A, B, Único"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Capacidad</label>
                  <input type="number" min="1" value={form.capacidad} onChange={e => set('capacidad', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Grado *</label>
                <select value={form.grado_id} onChange={e => set('grado_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">— Seleccionar —</option>
                  {grados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Maestro/a asignado/a</label>
                <select value={form.maestro_id} onChange={e => set('maestro_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">— Sin asignar —</option>
                  {maestros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
