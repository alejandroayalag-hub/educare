import { useState, useEffect } from 'react';
import { getAlumnos } from '../../api/controlEscolar';
import { getCargos, registrarPago, crearPreferenciaMP, getConceptos } from '../../api/cobranza';

const fmt = (n) => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n || 0);

export default function ModalPago({ onClose, onSuccess, alumnoPreseleccionado = null, cargoPreseleccionado = null }) {
  const [alumnos,   setAlumnos]   = useState([]);
  const [cargos,    setCargos]    = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [busqueda,  setBusqueda]  = useState('');
  const [alumnoSelec, setAlumnoSelec] = useState(alumnoPreseleccionado);
  const [form, setForm] = useState({
    cargo_id:    cargoPreseleccionado ? String(cargoPreseleccionado.id) : '',
    concepto_id: '',
    monto:       cargoPreseleccionado ? cargoPreseleccionado.monto : '',
    metodo: 'efectivo', referencia: '', notas: ''
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [mpLink,  setMpLink]  = useState('');

  useEffect(() => {
    getConceptos(true).then(setConceptos);
    if (alumnoPreseleccionado) {
      getCargos({ alumno_id: alumnoPreseleccionado.id, estatus: 'pendiente' }).then(setCargos);
    }
  }, []);

  const buscarAlumnos = async (q) => {
    setBusqueda(q);
    if (q.length < 2) { setAlumnos([]); return; }
    const res = await getAlumnos({ q, estatus:'activo' });
    setAlumnos(res.slice(0, 8));
  };

  const seleccionarAlumno = async (a) => {
    setAlumnoSelec(a);
    setAlumnos([]);
    setBusqueda('');
    const pendientes = await getCargos({ alumno_id: a.id, estatus: 'pendiente' });
    setCargos(pendientes);
    setForm(f => ({ ...f, cargo_id: '', monto: '' }));
  };

  const seleccionarCargo = (cargo_id) => {
    const cargo = cargos.find(c => String(c.id) === String(cargo_id));
    setForm(f => ({ ...f, cargo_id, monto: cargo ? cargo.monto : f.monto }));
  };

  const seleccionarConcepto = (concepto_id) => {
    const cp = conceptos.find(c => String(c.id) === String(concepto_id));
    setForm(f => ({ ...f, concepto_id, monto: cp ? cp.monto : f.monto }));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    setError(''); setSaving(true);
    try {
      if (!alumnoSelec) return setError('Selecciona un alumno');
      if (!form.monto || parseFloat(form.monto) <= 0) return setError('Ingresa un monto válido');

      const payload = {
        alumno_id: alumnoSelec.id,
        cargo_id:  form.cargo_id  || null,
        monto:     parseFloat(form.monto),
        metodo:    form.metodo,
        referencia: form.referencia || null,
        notas:     form.notas || null,
      };

      if (form.metodo === 'tarjeta') {
        const descripcion = form.cargo_id
          ? cargos.find(c => String(c.id) === String(form.cargo_id))?.descripcion || 'Pago escolar'
          : conceptos.find(c => String(c.id) === String(form.concepto_id))?.nombre || 'Pago escolar';
        const result = await crearPreferenciaMP({ ...payload, descripcion });
        setMpLink(result.sandbox_init_point || result.init_point);
        return;
      }

      await registrarPago(payload);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar pago');
    } finally { setSaving(false); }
  };

  if (mpLink) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 text-center">
          <div className="text-4xl mb-3">💳</div>
          <h3 className="font-semibold text-gray-800 mb-2">Link de pago generado</h3>
          <p className="text-sm text-gray-500 mb-4">Comparte el siguiente enlace con el padre de familia para que realice el pago con tarjeta:</p>
          <a href={mpLink} target="_blank" rel="noreferrer"
            className="block bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 mb-3">
            Abrir enlace de pago →
          </a>
          <p className="text-xs text-gray-400 break-all mb-4">{mpLink}</p>
          <button onClick={onSuccess} className="text-sm text-gray-600 hover:underline">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-gray-800 mb-4 text-lg">Registrar pago</h3>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

        {/* Búsqueda de alumno */}
        <div className="mb-4 relative">
          <label className="text-xs font-medium text-gray-600">Alumno *</label>
          {alumnoSelec ? (
            <div className="mt-1 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-indigo-800">{alumnoSelec.apellido_paterno} {alumnoSelec.nombre}</span>
              <button onClick={() => { setAlumnoSelec(null); setCargos([]); }} className="ml-auto text-xs text-indigo-500 hover:text-indigo-700">✕</button>
            </div>
          ) : (
            <>
              <input value={busqueda} onChange={e => buscarAlumnos(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              {alumnos.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {alumnos.map(a => (
                    <button key={a.id} onClick={() => seleccionarAlumno(a)}
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

        {/* Cargos pendientes */}
        {alumnoSelec && cargos.length > 0 && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600">Cargo pendiente (opcional)</label>
            <select value={form.cargo_id} onChange={e => seleccionarCargo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— Pago sin cargo asignado —</option>
              {cargos.map(c => (
                <option key={c.id} value={c.id}>
                  {c.concepto_nombre} {c.mes ? `— ${c.mes}/${c.anio}` : ''} — {fmt(c.monto)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Si no hay cargos, seleccionar concepto */}
        {alumnoSelec && !form.cargo_id && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600">Concepto de pago</label>
            <select value={form.concepto_id} onChange={e => seleccionarConcepto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— Seleccionar concepto —</option>
              {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre} — {fmt(c.monto)}</option>)}
            </select>
          </div>
        )}

        {/* Monto, método */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Monto *</label>
            <input type="number" min="0" step="0.01" value={form.monto} onChange={e => set('monto', e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Método de pago</label>
            <select value={form.metodo} onChange={e => set('metodo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta (MercadoPago)</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
        </div>

        {form.metodo === 'transferencia' && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600">Referencia / Folio</label>
            <input value={form.referencia} onChange={e => set('referencia', e.target.value)}
              placeholder="Número de referencia bancaria"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        )}

        {form.metodo === 'tarjeta' && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Se generará un enlace de MercadoPago para que el padre de familia pague con su tarjeta.
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600">Notas</label>
          <input value={form.notas} onChange={e => set('notas', e.target.value)}
            placeholder="Observaciones del pago..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={saving || !alumnoSelec}
            className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Procesando...' : form.metodo === 'tarjeta' ? 'Generar link de pago' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
