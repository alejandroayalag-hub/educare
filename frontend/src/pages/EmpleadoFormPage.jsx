import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEmpleado, crearEmpleado, updateEmpleado } from '../api/rh';

const DEPARTAMENTOS = ['Educativo','Administrativo','Servicios','Directivo'];
const PUESTOS = ['Directora','Secretaria','Maestra','Maestro','Auxiliar educativa','Personal de limpieza','Cocinera','Contador','Otro'];

export default function EmpleadoFormPage() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [form, setForm] = useState({
    nombre:'', apellido_paterno:'', apellido_materno:'',
    curp:'', rfc:'', fecha_nacimiento:'', fecha_ingreso: new Date().toISOString().slice(0,10),
    puesto:'', departamento:'', telefono:'', email:'',
    direccion:'', nombre_beneficiario:'',
    contacto_emergencia_nombre:'', contacto_emergencia_telefono:'',
    observaciones:'', estatus:'activo'
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (isEdit) getEmpleado(id).then(e => setForm({
      nombre: e.nombre||'', apellido_paterno: e.apellido_paterno||'', apellido_materno: e.apellido_materno||'',
      curp: e.curp||'', rfc: e.rfc||'',
      fecha_nacimiento: e.fecha_nacimiento?.slice(0,10)||'', fecha_ingreso: e.fecha_ingreso?.slice(0,10)||'',
      puesto: e.puesto||'', departamento: e.departamento||'',
      telefono: e.telefono||'', email: e.email||'',
      direccion: e.direccion||'', nombre_beneficiario: e.nombre_beneficiario||'',
      contacto_emergencia_nombre: e.contacto_emergencia_nombre||'',
      contacto_emergencia_telefono: e.contacto_emergencia_telefono||'',
      observaciones: e.observaciones||'', estatus: e.estatus||'activo'
    })).catch(() => setError('Error cargando empleado'));
  }, [id, isEdit]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async (ev) => {
    ev.preventDefault(); setError(''); setLoading(true);
    try {
      if (isEdit) { await updateEmpleado(id, form); navigate(`/rh/empleados/${id}`); }
      else { const n = await crearEmpleado(form); navigate(`/rh/empleados/${n.id}`); }
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar'); }
    finally { setLoading(false); }
  };

  const Inp = ({ k, label, type='text', placeholder='', required=false }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 text-sm">← Atrás</button>
        <h1 className="text-2xl font-bold text-gray-800">{isEdit ? 'Editar empleado' : 'Nuevo empleado'}</h1>
      </div>
      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      <form onSubmit={guardar} className="space-y-5">
        {/* Datos personales */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Datos personales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp k="nombre"           label="Nombre(s)"        required />
            <Inp k="apellido_paterno" label="Apellido paterno" required />
            <Inp k="apellido_materno" label="Apellido materno" />
            <Inp k="curp"             label="CURP"  placeholder="18 caracteres" />
            <Inp k="rfc"              label="RFC"   placeholder="13 caracteres" />
            <Inp k="fecha_nacimiento" label="Fecha nacimiento" type="date" />
            <Inp k="telefono"         label="Teléfono" />
            <Inp k="email"            label="Email" type="email" />
            <Inp k="fecha_ingreso"    label="Fecha de ingreso" type="date" required />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Puesto</label>
              <select value={form.puesto} onChange={e => set('puesto', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">— Seleccionar —</option>
                {PUESTOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Departamento</label>
              <select value={form.departamento} onChange={e => set('departamento', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">— Seleccionar —</option>
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estatus</label>
                <select value={form.estatus} onChange={e => set('estatus', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
            )}
            <div className="md:col-span-3">
              <Inp k="direccion" label="Dirección" />
            </div>
          </div>
        </div>

        {/* Datos adicionales */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Información adicional</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Inp k="nombre_beneficiario"          label="Nombre del beneficiario" />
            <Inp k="contacto_emergencia_nombre"   label="Contacto de emergencia" />
            <Inp k="contacto_emergencia_telefono" label="Teléfono emergencia" />
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
              <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear empleado'}
          </button>
        </div>
      </form>
    </div>
  );
}
