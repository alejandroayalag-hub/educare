import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAlumno, crearAlumno, updateAlumno } from '../api/controlEscolar';

const SEXOS = ['masculino','femenino','otro'];
const TIPOS_SANGRE = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function AlumnoFormPage() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [form, setForm] = useState({
    nombre:'', apellido_paterno:'', apellido_materno:'',
    fecha_nacimiento:'', curp:'', sexo:'', direccion:'',
    alergias:'', condiciones_medicas:'', tipo_sangre:'',
    estatus:'activo', observaciones:''
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (isEdit) {
      getAlumno(id).then(a => {
        setForm({
          nombre: a.nombre || '',
          apellido_paterno: a.apellido_paterno || '',
          apellido_materno: a.apellido_materno || '',
          fecha_nacimiento: a.fecha_nacimiento?.slice(0,10) || '',
          curp: a.curp || '',
          sexo: a.sexo || '',
          direccion: a.direccion || '',
          alergias: a.alergias || '',
          condiciones_medicas: a.condiciones_medicas || '',
          tipo_sangre: a.tipo_sangre || '',
          estatus: a.estatus || 'activo',
          observaciones: a.observaciones || ''
        });
      }).catch(() => setError('Error cargando alumno'));
    }
  }, [id, isEdit]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await updateAlumno(id, form);
        navigate(`/control-escolar/alumnos/${id}`);
      } else {
        const nuevo = await crearAlumno(form);
        navigate(`/control-escolar/alumnos/${nuevo.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const Campo = ({ label, children, required }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
  const input = (k, type='text', placeholder='') => (
    <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 text-sm">← Atrás</button>
        <h1 className="text-2xl font-bold text-gray-800">{isEdit ? 'Editar alumno' : 'Nuevo alumno'}</h1>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      <form onSubmit={guardar} className="space-y-6">
        {/* Datos personales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Datos personales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo label="Nombre(s)" required>
              {input('nombre', 'text', 'Ej. María José')}
            </Campo>
            <Campo label="Apellido paterno" required>
              {input('apellido_paterno', 'text', 'Ej. García')}
            </Campo>
            <Campo label="Apellido materno">
              {input('apellido_materno', 'text', 'Ej. López')}
            </Campo>
            <Campo label="Fecha de nacimiento" required>
              {input('fecha_nacimiento', 'date')}
            </Campo>
            <Campo label="CURP">
              {input('curp', 'text', '18 caracteres')}
            </Campo>
            <Campo label="Sexo">
              <select value={form.sexo} onChange={e => set('sexo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">— Seleccionar —</option>
                {SEXOS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </Campo>
            <div className="md:col-span-3">
              <Campo label="Dirección">
                <textarea value={form.direccion} onChange={e => set('direccion', e.target.value)}
                  rows={2} placeholder="Calle, número, colonia, ciudad..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </Campo>
            </div>
          </div>
        </div>

        {/* Datos médicos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Datos médicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Tipo de sangre">
              <select value={form.tipo_sangre} onChange={e => set('tipo_sangre', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">— Seleccionar —</option>
                {TIPOS_SANGRE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
            {isEdit && (
              <Campo label="Estatus">
                <select value={form.estatus} onChange={e => set('estatus', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {['activo','inactivo','egresado','baja'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </Campo>
            )}
            <div className="md:col-span-2">
              <Campo label="Alergias">
                <textarea value={form.alergias} onChange={e => set('alergias', e.target.value)}
                  rows={2} placeholder="Describe las alergias conocidas..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </Campo>
            </div>
            <div className="md:col-span-2">
              <Campo label="Condiciones médicas">
                <textarea value={form.condiciones_medicas} onChange={e => set('condiciones_medicas', e.target.value)}
                  rows={2} placeholder="Condiciones relevantes para la escuela..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </Campo>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Observaciones</h2>
          <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
            rows={3} placeholder="Notas generales del alumno..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Guardando...' : isEdit ? 'Actualizar alumno' : 'Crear alumno'}
          </button>
        </div>
      </form>
    </div>
  );
}
