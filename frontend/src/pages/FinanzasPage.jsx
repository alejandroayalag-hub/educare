import { useState, useEffect, useCallback } from 'react';
import { getResumenFinanzas, getEgresos, crearEgreso, updateEgreso, eliminarEgreso } from '../api/finanzas';

const CATEGORIAS = ['nomina','renta','servicios','mantenimiento','material','operativo','otro'];

const catLabel = c => ({ nomina:'Nómina', renta:'Renta', servicios:'Servicios', mantenimiento:'Mantenimiento',
  material:'Material', operativo:'Operativo', otro:'Otro' })[c] ?? c;

const catColor = c => ({ nomina:'bg-violet-100 text-violet-700', renta:'bg-amber-100 text-amber-700',
  servicios:'bg-blue-100 text-blue-700', mantenimiento:'bg-orange-100 text-orange-700',
  material:'bg-teal-100 text-teal-700', operativo:'bg-rose-100 text-rose-700',
  otro:'bg-gray-100 text-gray-600' })[c] ?? 'bg-gray-100 text-gray-600';

const fmt = n => new Intl.NumberFormat('es-MX',{ style:'currency', currency:'MXN' }).format(n ?? 0);
const fmtDate = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-MX',{ day:'2-digit', month:'short', year:'numeric' }) : '';

const EGRESO_EMPTY = { descripcion:'', monto:'', categoria:'operativo', fecha:'', referencia:'' };

function ModalEgreso({ egreso, onClose, onSave }) {
  const [form, setForm] = useState(egreso ?? EGRESO_EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    if (!form.descripcion.trim() || !form.monto || !form.fecha) { setErr('Descripción, monto y fecha son requeridos.'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch { setErr('Error al guardar.'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">{egreso ? 'Editar egreso' : 'Nuevo egreso'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej. Pago de luz junio" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto *</label>
              <input type="number" step="0.01" min="0" value={form.monto} onChange={e => set('monto', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {CATEGORIAS.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Referencia / Nota</label>
            <input value={form.referencia} onChange={e => set('referencia', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Folio, ticket, etc." />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TabResumen({ mes, anio }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getResumenFinanzas(mes, anio)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [mes, anio]);

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando resumen…</div>;
  if (!data)   return <div className="text-center py-16 text-gray-400">No hay datos.</div>;

  const utilidadColor = data.utilidad >= 0 ? 'text-green-700' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Cards principales */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium mb-1">Ingresos del mes</p>
          <p className="text-2xl font-bold text-green-700">{fmt(data.ingresos)}</p>
          <p className="text-xs text-green-600 mt-1">{data.num_pagos ?? 0} pagos registrados</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium mb-1">Egresos del mes</p>
          <p className="text-2xl font-bold text-red-700">{fmt(data.egresos)}</p>
          <p className="text-xs text-red-600 mt-1">{data.num_egresos ?? 0} egresos registrados</p>
        </div>
        <div className={`border rounded-xl p-4 ${data.utilidad >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-xs font-medium mb-1 ${data.utilidad >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Utilidad neta</p>
          <p className={`text-2xl font-bold ${utilidadColor}`}>{fmt(data.utilidad)}</p>
          <p className="text-xs text-gray-500 mt-1">Pendiente por cobrar: {fmt(data.pendiente)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Egresos por categoría */}
        <div className="bg-white border rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Egresos por categoría</h4>
          {(!data.por_categoria || data.por_categoria.length === 0)
            ? <p className="text-xs text-gray-400">Sin egresos este mes.</p>
            : <div className="space-y-2">
                {data.por_categoria.map(row => (
                  <div key={row.categoria} className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor(row.categoria)}`}>{catLabel(row.categoria)}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-red-400 h-2 rounded-full" style={{ width: `${data.egresos > 0 ? (row.total/data.egresos)*100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-24 text-right">{fmt(row.total)}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Ingresos diarios */}
        <div className="bg-white border rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Ingresos diarios del mes</h4>
          {(!data.ingresos_diarios || data.ingresos_diarios.length === 0)
            ? <p className="text-xs text-gray-400">Sin ingresos este mes.</p>
            : <div className="space-y-1 max-h-44 overflow-y-auto">
                {data.ingresos_diarios.map(d => (
                  <div key={d.dia} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 w-20">{fmtDate(d.dia)}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-400 h-1.5 rounded-full"
                        style={{ width: `${data.ingresos > 0 ? (d.total/data.ingresos)*100 : 0}%` }} />
                    </div>
                    <span className="font-medium text-gray-700 w-24 text-right">{fmt(d.total)}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Histórico 6 meses */}
      {data.historico && data.historico.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Histórico últimos 6 meses</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left pb-2">Mes</th>
                  <th className="text-right pb-2">Ingresos</th>
                  <th className="text-right pb-2">Egresos</th>
                  <th className="text-right pb-2">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {data.historico.map(h => (
                  <tr key={`${h.anio}-${h.mes}`} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 text-gray-700">{new Date(h.anio, h.mes - 1).toLocaleDateString('es-MX',{ month:'long', year:'numeric' })}</td>
                    <td className="py-2 text-right text-green-700 font-medium">{fmt(h.ingresos)}</td>
                    <td className="py-2 text-right text-red-600 font-medium">{fmt(h.egresos)}</td>
                    <td className={`py-2 text-right font-semibold ${h.utilidad >= 0 ? 'text-blue-700' : 'text-amber-600'}`}>{fmt(h.utilidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TabEgresos({ mes, anio }) {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'nuevo' | egreso_obj
  const [delId, setDelId]     = useState(null);
  const [filtCat, setFiltCat] = useState('');
  const [search, setSearch]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getEgresos({ mes, anio })
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [mes, anio]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async form => {
    if (modal === 'nuevo') {
      await crearEgreso({ ...form, monto: parseFloat(form.monto) });
    } else {
      await updateEgreso(modal.id, { ...form, monto: parseFloat(form.monto) });
    }
    load();
  };

  const handleDel = async () => {
    await eliminarEgreso(delId);
    setDelId(null);
    load();
  };

  const filtered = list.filter(e => {
    const matchCat  = !filtCat || e.categoria === filtCat;
    const matchTxt  = !search  || e.descripcion.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchTxt;
  });

  const total = filtered.reduce((s, e) => s + parseFloat(e.monto), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar descripción…"
          className="border rounded-lg px-3 py-1.5 text-sm w-56" />
        <select value={filtCat} onChange={e => setFiltCat(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-sm font-semibold text-red-700">Total: {fmt(total)}</span>
        <button onClick={() => setModal('nuevo')}
          className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700">
          + Nuevo egreso
        </button>
      </div>

      {loading
        ? <div className="text-center py-10 text-gray-400">Cargando…</div>
        : filtered.length === 0
          ? <div className="text-center py-10 text-gray-400">Sin egresos{filtCat || search ? ' para el filtro aplicado' : ' este mes'}.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b">
                    <th className="text-left pb-2">Fecha</th>
                    <th className="text-left pb-2">Descripción</th>
                    <th className="text-left pb-2">Categoría</th>
                    <th className="text-left pb-2">Referencia</th>
                    <th className="text-right pb-2">Monto</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 text-gray-600">{fmtDate(e.fecha)}</td>
                      <td className="py-2.5 font-medium text-gray-800">{e.descripcion}</td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor(e.categoria)}`}>
                          {catLabel(e.categoria)}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-400 text-xs">{e.referencia ?? '—'}</td>
                      <td className="py-2.5 text-right font-semibold text-red-700">{fmt(e.monto)}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => setModal(e)} className="text-xs text-indigo-600 hover:underline mr-2">Editar</button>
                        <button onClick={() => setDelId(e.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }

      {modal && (
        <ModalEgreso
          egreso={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {delId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 text-center">
            <p className="text-gray-700 mb-4">¿Eliminar este egreso?</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setDelId(null)} className="border rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDel} className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function FinanzasPage() {
  const hoy  = new Date();
  const [mes,  setMes]  = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [tab,  setTab]  = useState('resumen');

  const anios = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - i);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Finanzas</h1>
          <p className="text-sm text-gray-500">Resumen financiero e historial de egresos</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="border rounded-lg px-3 py-1.5 text-sm">
            {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))}
            className="border rounded-lg px-3 py-1.5 text-sm">
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-1 border-b mb-6">
        {[['resumen','Resumen'],['egresos','Egresos']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <TabResumen mes={mes} anio={anio} />}
      {tab === 'egresos' && <TabEgresos mes={mes} anio={anio} />}
    </div>
  );
}
