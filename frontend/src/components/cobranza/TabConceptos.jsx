import { useState, useEffect } from 'react';
import { getConceptos, crearConcepto, updateConcepto, eliminarConcepto } from '../../api/cobranza';

const TIPOS = ['mensualidad','inscripcion','guarderia','uniforme','otro'];
const fmt   = (n) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n || 0);

export default function TabConceptos() {
  const [conceptos, setConceptos] = useState([]);
  const [modal,     setModal]     = useState(false);
  const [editando,  setEditando]  = useState(null);
  const [form, setForm] = useState({ nombre:'', descripcion:'', monto:'', tipo:'mensualidad', activo:true });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const cargar = () => getConceptos().then(setConceptos);
  useEffect(() => { cargar(); }, []);

  const abrir = (c = null) => {
    if (c) {
      setEditando(c.id);
      setForm({ nombre: c.nombre, descripcion: c.descripcion||'', monto: c.monto, tipo: c.tipo, activo: c.activo });
    } else {
      setEditando(null);
      setForm({ nombre:'', descripcion:'', monto:'', tipo:'mensualidad', activo:true });
    }
    setError(''); setModal(true);
  };

  const guardar = async () => {
    setError(''); setSaving(true);
    try {
      if (editando) await updateConcepto(editando, form);
      else await crearConcepto(form);
      cargar(); setModal(false);
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const deshabilitar = async (id) => {
    if (!confirm('¿Deshabilitar este concepto?')) return;
    await eliminarConcepto(id);
    cargar();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tipoBadge = (t) => ({ mensualidad:'bg-indigo-100 text-indigo-800', inscripcion:'bg-purple-100 text-purple-800', guarderia:'bg-blue-100 text-blue-800', uniforme:'bg-amber-100 text-amber-800', otro:'bg-gray-100 text-gray-600' }[t]||'');

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold text-gray-700">Conceptos de pago</h2>
        <button onClick={() => abrir()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Nuevo concepto
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-left">Estatus</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {conceptos.map(c => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{c.nombre}</p>
                  {c.descripcion && <p className="text-xs text-gray-400">{c.descripcion}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${tipoBadge(c.tipo)}`}>{c.tipo}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(c.monto)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => abrir(c)} className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">Editar</button>
                    {c.activo && <button onClick={() => deshabilitar(c.id)} className="text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50">Deshabilitar</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">{editando ? 'Editar concepto' : 'Nuevo concepto de pago'}</h3>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nombre *</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Tipo</label>
                  <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {TIPOS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Monto *</label>
                  <input type="number" min="0" step="0.01" value={form.monto} onChange={e => set('monto', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Descripción</label>
                <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              {editando && (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} className="rounded" />
                  Concepto activo
                </label>
              )}
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
