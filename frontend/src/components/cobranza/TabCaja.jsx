import { useState, useEffect, useCallback } from 'react';
import { getPagos, getResumenDia, generarCorte, registrarPago, getCortes } from '../../api/cobranza';
import { getAlumnos } from '../../api/controlEscolar';
import { getCargos }  from '../../api/cobranza';
import ModalPago from './ModalPago';

const fmt = (n) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n || 0);

export default function TabCaja() {
  const [fecha, setFecha]     = useState(new Date().toISOString().slice(0,10));
  const [resumen, setResumen] = useState(null);
  const [pagos,   setPagos]   = useState([]);
  const [cortes,  setCortes]  = useState([]);
  const [modal,   setModal]   = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [r, p, c] = await Promise.all([getResumenDia(fecha), getPagos({ fecha_inicio: fecha, fecha_fin: fecha }), getCortes()]);
      setResumen(r);
      setPagos(p);
      setCortes(c);
    } catch {} finally { setCargando(false); }
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  const hacerCorte = async () => {
    if (!confirm('¿Generar corte de caja para esta fecha? Se guardará el resumen de pagos del día.')) return;
    await generarCorte({ fecha });
    cargar();
  };

  const metodoBadge = (m) => ({
    efectivo:       'bg-green-100 text-green-800',
    tarjeta:        'bg-blue-100 text-blue-800',
    transferencia:  'bg-purple-100 text-purple-800',
  }[m] || 'bg-gray-100 text-gray-600');

  return (
    <div className="space-y-6">
      {/* Selector de fecha + botón nuevo pago */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">Fecha:</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <button onClick={() => setModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Registrar pago
        </button>
        <button onClick={hacerCorte}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
          Generar corte
        </button>
      </div>

      {/* Tarjetas de resumen */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label:'Total del día', valor: resumen.total, color:'bg-blue-50 border-blue-100 text-blue-800' },
            { label:'Efectivo',      valor: resumen.efectivo, color:'bg-green-50 border-green-100 text-green-800' },
            { label:'Tarjeta',       valor: resumen.tarjeta,  color:'bg-blue-50 border-blue-100 text-blue-800' },
            { label:'Transferencia', valor: resumen.transferencia, color:'bg-purple-50 border-purple-100 text-purple-800' },
          ].map(t => (
            <div key={t.label} className={`rounded-xl border p-4 ${t.color}`}>
              <p className="text-xl font-bold">{fmt(t.valor)}</p>
              <p className="text-xs font-medium mt-0.5 opacity-70">{t.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de pagos del día */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 text-sm">Pagos del {new Date(fecha+'T00:00:00').toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' })}</h2>
          <span className="text-xs text-gray-400">{pagos.length} registros</span>
        </div>
        {cargando ? (
          <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
        ) : pagos.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Sin pagos registrados en esta fecha</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Alumno</th>
                <th className="px-4 py-2 text-left">Concepto</th>
                <th className="px-4 py-2 text-left">Método</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-left">Cajero</th>
                <th className="px-4 py-2 text-left">Hora</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{p.apellido_paterno} {p.alumno_nombre}</td>
                  <td className="px-4 py-2 text-gray-600">{p.cargo_descripcion || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${metodoBadge(p.metodo)}`}>{p.metodo}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-800">{fmt(p.monto)}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{p.cajero_nombre || '—'}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">
                    {new Date(p.fecha_pago).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cortes recientes */}
      {cortes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Cortes de caja recientes</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-right">Efectivo</th>
                <th className="px-4 py-2 text-right">Tarjeta</th>
                <th className="px-4 py-2 text-right">Transferencia</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-left">Pagos</th>
              </tr>
            </thead>
            <tbody>
              {cortes.slice(0,10).map(c => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{new Date(c.fecha+'T00:00:00').toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' })}</td>
                  <td className="px-4 py-2 text-right text-green-700">{fmt(c.total_efectivo)}</td>
                  <td className="px-4 py-2 text-right text-blue-700">{fmt(c.total_tarjeta)}</td>
                  <td className="px-4 py-2 text-right text-purple-700">{fmt(c.total_transferencia)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-800">{fmt(c.total)}</td>
                  <td className="px-4 py-2 text-gray-500">{c.num_pagos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ModalPago onClose={() => setModal(false)} onSuccess={() => { setModal(false); cargar(); }} />}
    </div>
  );
}
