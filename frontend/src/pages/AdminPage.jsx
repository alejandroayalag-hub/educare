import { useEffect, useState } from 'react';
import { getEscuela, updateEscuela, uploadLogo, getCiclos, crearCiclo, activarCiclo, eliminarCiclo } from '../api/escuela';
import { getUsuarios, crearUsuario, updateUsuario, eliminarUsuario } from '../api/usuarios';

const ROLES = ['directora', 'secretaria', 'maestro', 'contador'];
const ROL_COLOR = {
  directora:  'bg-purple-100 text-purple-800',
  secretaria: 'bg-blue-100 text-blue-800',
  maestro:    'bg-green-100 text-green-800',
  contador:   'bg-yellow-100 text-yellow-800',
};

export default function AdminPage() {
  const [tab, setTab] = useState('escuela');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Administración</h1>

      <div className="flex border-b">
        {[['escuela','Datos de la escuela'],['usuarios','Usuarios'],['ciclos','Ciclos escolares']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === k ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'escuela'  && <TabEscuela />}
      {tab === 'usuarios' && <TabUsuarios />}
      {tab === 'ciclos'   && <TabCiclos />}
    </div>
  );
}

// ─── Tab Escuela ────────────────────────────────────────────────────────────
function TabEscuela() {
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [exito, setExito]     = useState('');

  useEffect(() => { getEscuela().then(setForm); }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setExito('');
    await updateEscuela(form);
    setExito('Guardado correctamente');
    setSaving(false);
  };

  const handleLogo = async file => {
    if (!file) return;
    const fd = new FormData(); fd.append('logo', file);
    const updated = await uploadLogo(fd);
    setForm(updated);
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl shadow p-6 max-w-2xl space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <label className="cursor-pointer">
          {form.logo_ruta ? (
            <img src={`/uploads/escuela/logo${form.logo_ruta?.split('logo')[1] || ''}`}
              alt="Logo" className="w-16 h-16 rounded-xl object-contain border" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl border-2 border-dashed border-indigo-300">
              GK
            </div>
          )}
          <input type="file" accept=".jpg,.jpeg,.png,.svg" className="hidden"
            onChange={e => handleLogo(e.target.files[0])} />
        </label>
        <div>
          <p className="text-sm font-medium text-gray-700">Logo de la escuela</p>
          <p className="text-xs text-gray-400">Haz clic en la imagen para cambiar (JPG, PNG, SVG)</p>
        </div>
      </div>

      {[
        { name:'nombre',         label:'Nombre de la escuela', required: true },
        { name:'slogan',         label:'Slogan' },
        { name:'direccion',      label:'Dirección' },
        { name:'telefono',       label:'Teléfono' },
        { name:'email',          label:'Email de contacto', type:'email' },
        { name:'rfc',            label:'RFC' },
        { name:'color_primario', label:'Color primario (hex)', placeholder:'#2563eb' },
      ].map(f => (
        <div key={f.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          <input type={f.type || 'text'} name={f.name} value={form[f.name] || ''}
            onChange={handleChange} required={f.required} placeholder={f.placeholder}
            className="border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {exito && <span className="text-green-600 text-sm">{exito}</span>}
      </div>
    </form>
  );
}

// ─── Tab Usuarios ────────────────────────────────────────────────────────────
function TabUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm]         = useState({ nombre:'', email:'', password:'', rol:'secretaria' });
  const [editando, setEditando] = useState(null);
  const [error, setError]       = useState('');

  const cargar = () => getUsuarios().then(setUsuarios);
  useEffect(() => { cargar(); }, []);

  const handleGuardar = async e => {
    e.preventDefault(); setError('');
    try {
      if (editando) {
        await updateUsuario(editando.id, form);
      } else {
        await crearUsuario(form);
      }
      setForm({ nombre:'', email:'', password:'', rol:'secretaria' });
      setEditando(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const handleEditar = u => {
    setEditando(u);
    setForm({ nombre: u.nombre, email: u.email, password:'', rol: u.rol, activo: u.activo });
  };

  const handleEliminar = async id => {
    if (!confirm('¿Eliminar este usuario?')) return;
    await eliminarUsuario(id);
    cargar();
  };

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-5 max-w-xl">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          {editando ? `Editando: ${editando.nombre}` : 'Nuevo usuario'}
        </h2>
        <form onSubmit={handleGuardar} className="space-y-3">
          <input required placeholder="Nombre completo" value={form.nombre}
            onChange={e => setForm(f=>({...f, nombre:e.target.value}))}
            className="border rounded-lg px-3 py-2 w-full text-sm" />
          <input required type="email" placeholder="Correo" value={form.email}
            onChange={e => setForm(f=>({...f, email:e.target.value}))}
            className="border rounded-lg px-3 py-2 w-full text-sm" />
          <input type="password" placeholder={editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            required={!editando} value={form.password}
            onChange={e => setForm(f=>({...f, password:e.target.value}))}
            className="border rounded-lg px-3 py-2 w-full text-sm" />
          <select value={form.rol} onChange={e => setForm(f=>({...f, rol:e.target.value}))}
            className="border rounded-lg px-3 py-2 w-full text-sm">
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
          </select>
          {editando && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activo ?? true}
                onChange={e => setForm(f=>({...f, activo:e.target.checked}))} />
              Usuario activo
            </label>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
              {editando ? 'Actualizar' : 'Crear usuario'}
            </button>
            {editando && (
              <button type="button" onClick={() => { setEditando(null); setForm({ nombre:'', email:'', password:'', rol:'secretaria' }); }}
                className="px-4 py-2 text-sm text-gray-600 hover:underline">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow overflow-hidden max-w-2xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Nombre</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Correo</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Rol</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {usuarios.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{u.nombre}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROL_COLOR[u.rol]}`}>
                    {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right flex gap-3 justify-end">
                  <button onClick={() => handleEditar(u)} className="text-indigo-600 text-xs hover:underline">Editar</button>
                  <button onClick={() => handleEliminar(u.id)} className="text-red-500 text-xs hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab Ciclos ───────────────────────────────────────────────────────────────
function TabCiclos() {
  const [ciclos, setCiclos] = useState([]);
  const [form, setForm]     = useState({ nombre:'', fecha_inicio:'', fecha_fin:'' });
  const [error, setError]   = useState('');

  const cargar = () => getCiclos().then(setCiclos);
  useEffect(() => { cargar(); }, []);

  const handleCrear = async e => {
    e.preventDefault(); setError('');
    try {
      await crearCiclo(form);
      setForm({ nombre:'', fecha_inicio:'', fecha_fin:'' });
      cargar();
    } catch (err) { setError(err.response?.data?.error || 'Error al crear'); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-5 max-w-lg">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Nuevo ciclo escolar</h2>
        <form onSubmit={handleCrear} className="space-y-3">
          <input required placeholder="Ej: 2025-2026" value={form.nombre}
            onChange={e => setForm(f=>({...f, nombre:e.target.value}))}
            className="border rounded-lg px-3 py-2 w-full text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Inicio</label>
              <input required type="date" value={form.fecha_inicio}
                onChange={e => setForm(f=>({...f, fecha_inicio:e.target.value}))}
                className="border rounded-lg px-3 py-2 w-full text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fin</label>
              <input required type="date" value={form.fecha_fin}
                onChange={e => setForm(f=>({...f, fecha_fin:e.target.value}))}
                className="border rounded-lg px-3 py-2 w-full text-sm" />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
            Crear ciclo
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden max-w-lg">
        {ciclos.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">Sin ciclos registrados.</p>
        ) : (
          <div className="divide-y">
            {ciclos.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{c.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {c.fecha_inicio?.slice(0,10)} — {c.fecha_fin?.slice(0,10)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {c.activo ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">Activo</span>
                  ) : (
                    <button onClick={() => activarCiclo(c.id).then(cargar)}
                      className="text-xs text-indigo-600 hover:underline">
                      Activar
                    </button>
                  )}
                  <button onClick={() => { if(confirm('¿Eliminar este ciclo?')) eliminarCiclo(c.id).then(cargar); }}
                    className="text-xs text-red-500 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
