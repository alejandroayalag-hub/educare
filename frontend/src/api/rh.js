import api from './client';

// Empleados
export const getEmpleados      = (params)   => api.get('/empleados', { params }).then(r => r.data);
export const getEmpleado       = (id)       => api.get(`/empleados/${id}`).then(r => r.data);
export const crearEmpleado     = (data)     => api.post('/empleados', data).then(r => r.data);
export const updateEmpleado    = (id, data) => api.put(`/empleados/${id}`, data).then(r => r.data);
export const eliminarEmpleado  = (id)       => api.delete(`/empleados/${id}`);
export const subirFotoEmpleado = (id, file) => {
  const fd = new FormData(); fd.append('foto', file);
  return api.post(`/empleados/${id}/foto`, fd).then(r => r.data);
};

// Documentos
export const getTiposDocEmpleado  = ()                    => api.get('/documentos-empleados/tipos').then(r => r.data);
export const getDocumentosEmpleado= (empleado_id)         => api.get('/documentos-empleados', { params: { empleado_id } }).then(r => r.data);
export const subirDocEmpleado     = (empleado_id, tipo_id, file) => {
  const fd = new FormData(); fd.append('archivo', file); fd.append('empleado_id', empleado_id); fd.append('tipo_documento_id', tipo_id);
  return api.post('/documentos-empleados', fd).then(r => r.data);
};
export const descargarDocEmpleado = (id, filename)        => api.get(`/documentos-empleados/${id}/download`, { responseType: 'blob' })
  .then(r => { const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = filename; a.click(); });
export const eliminarDocEmpleado  = (id)                  => api.delete(`/documentos-empleados/${id}`);

// Checadas
export const getDispositivos  = ()               => api.get('/checadas/dispositivos').then(r => r.data);
export const crearDispositivo = (data)           => api.post('/checadas/dispositivos', data).then(r => r.data);
export const getMappings      = ()               => api.get('/checadas/mappings').then(r => r.data);
export const upsertMapping    = (data)           => api.post('/checadas/mappings', data).then(r => r.data);
export const eliminarMapping  = (id)             => api.delete(`/checadas/mappings/${id}`);
export const getChecadasEmpleado = (id, params)  => api.get(`/checadas/empleado/${id}`, { params }).then(r => r.data);

// Nómina
export const getNominaSemanas  = ()          => api.get('/nomina/semanas').then(r => r.data);
export const getNominaSemana   = (id)        => api.get(`/nomina/semana/${id}`).then(r => r.data);
export const parsearNomina     = (file)      => { const fd = new FormData(); fd.append('pdf', file); return api.post('/nomina/parsear', fd).then(r => r.data); };
export const importarNomina    = (file, semana, anio, registros) => {
  const fd = new FormData(); fd.append('pdf', file); fd.append('semana', semana); fd.append('anio', anio); fd.append('registros', JSON.stringify(registros));
  return api.post('/nomina/importar', fd).then(r => r.data);
};
export const descargarSemana   = (id, filename) => api.get(`/nomina/semana/${id}/descargar`, { responseType: 'blob' })
  .then(r => { const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = filename; a.click(); });
export const eliminarSemana    = (id)        => api.delete(`/nomina/semana/${id}`);
export const getNominaEmpleado = (id)        => api.get(`/nomina/empleado/${id}`).then(r => r.data);
