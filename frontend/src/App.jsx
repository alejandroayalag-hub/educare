import { BrowserRouter, Routes, Route, NavLink, useNavigate, Link } from 'react-router-dom';
import LoginPage          from './pages/LoginPage';
import DashboardPage      from './pages/DashboardPage';
import AdminPage          from './pages/AdminPage';
import AlumnosPage        from './pages/AlumnosPage';
import AlumnoFormPage     from './pages/AlumnoFormPage';
import AlumnoDetallePage  from './pages/AlumnoDetallePage';
import GruposPage         from './pages/GruposPage';
import CobranzaPage          from './pages/CobranzaPage';
import EmpleadosPage         from './pages/EmpleadosPage';
import EmpleadoFormPage      from './pages/EmpleadoFormPage';
import EmpleadoDetallePage   from './pages/EmpleadoDetallePage';
import NominaPage            from './pages/NominaPage';
import NotificacionesPage   from './pages/NotificacionesPage';
import FinanzasPage         from './pages/FinanzasPage';
import ProtectedRoute        from './components/ProtectedRoute';

function PagoResultado({ tipo }) {
  const config = {
    exitoso:  { icon:'✅', title:'Pago exitoso', msg:'El pago se procesó correctamente.', color:'text-green-700' },
    fallido:  { icon:'❌', title:'Pago fallido',  msg:'Hubo un problema con el pago. Intenta nuevamente.',  color:'text-red-700' },
    pendiente:{ icon:'⏳', title:'Pago pendiente', msg:'El pago está siendo procesado. Te notificaremos.', color:'text-amber-700' },
  }[tipo];
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{config.icon}</div>
      <h2 className={`text-2xl font-bold mb-2 ${config.color}`}>{config.title}</h2>
      <p className="text-gray-500 mb-6">{config.msg}</p>
      <Link to="/cobranza" className="text-blue-700 hover:underline text-sm">← Volver a Cobranza</Link>
    </div>
  );
}

function Layout() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('nombre');
  const rol    = localStorage.getItem('rol');

  const navItems = [
    { to:'/',                         label:'Inicio',          roles: null },
    { to:'/control-escolar/alumnos',  label:'Alumnos',         roles: null },
    { to:'/control-escolar/grupos',   label:'Grupos',          roles: ['directora','secretaria'] },
    { to:'/cobranza',                 label:'Cobranza',        roles: ['directora','secretaria','contador'] },
    { to:'/rh/empleados',            label:'RH',              roles: ['directora','secretaria'] },
    { to:'/notificaciones',          label:'Notificaciones',  roles: ['directora','secretaria'] },
    { to:'/finanzas',                label:'Finanzas',        roles: ['directora','contador'] },
    { to:'/admin',                    label:'Administración',  roles: ['directora'] },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Educare" className="h-8 w-auto rounded" />
          <span className="font-bold text-gray-800 text-sm tracking-wide">COLEGIO EDUCARE</span>
        </div>

        <div className="ml-6 flex gap-4 flex-1">
          {navItems.filter(n => !n.roles || n.roles.includes(rol)).map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) =>
                isActive ? 'text-blue-700 font-medium text-sm' : 'text-gray-600 hover:text-blue-700 text-sm'
              }>
              {n.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 capitalize">{rol}</span>
          <span className="text-sm text-gray-600">{nombre}</span>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }}
            className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">
            Salir
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/control-escolar/alumnos"          element={<AlumnosPage />} />
          <Route path="/control-escolar/alumnos/nuevo"    element={<AlumnoFormPage />} />
          <Route path="/control-escolar/alumnos/:id"      element={<AlumnoDetallePage />} />
          <Route path="/control-escolar/alumnos/:id/editar" element={<AlumnoFormPage />} />
          <Route path="/control-escolar/grupos"           element={<GruposPage />} />
          <Route path="/cobranza"                              element={<CobranzaPage />} />
          <Route path="/rh/empleados"                        element={<EmpleadosPage />} />
          <Route path="/rh/empleados/nuevo"                  element={<EmpleadoFormPage />} />
          <Route path="/rh/empleados/:id"                    element={<EmpleadoDetallePage />} />
          <Route path="/rh/empleados/:id/editar"             element={<EmpleadoFormPage />} />
          <Route path="/rh/nomina"                           element={<NominaPage />} />
          <Route path="/notificaciones"                      element={<NotificacionesPage />} />
          <Route path="/finanzas"                            element={<FinanzasPage />} />
          <Route path="/cobranza/pago-exitoso"           element={<PagoResultado tipo="exitoso" />} />
          <Route path="/cobranza/pago-fallido"           element={<PagoResultado tipo="fallido" />} />
          <Route path="/cobranza/pago-pendiente"         element={<PagoResultado tipo="pendiente" />} />
          <Route path="/admin" element={
            <ProtectedRoute roles={['directora']}>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
