import api from './client';

// Grados
export const getGrados = () => api.get('/grados').then(r => r.data);

// Grupos
export const getGrupos       = (ciclo_id) => api.get('/grupos', { params: { ciclo_id } }).then(r => r.data);
export const crearGrupo      = (data)     => api.post('/grupos', data).then(r => r.data);
export const updateGrupo     = (id, data) => api.put(`/grupos/${id}`, data).then(r => r.data);
export const eliminarGrupo   = (id)       => api.delete(`/grupos/${id}`);

// Alumnos
export const getAlumnos      = (params)   => api.get('/alumnos', { params }).then(r => r.data);
export const getAlumno       = (id)       => api.get(`/alumnos/${id}`).then(r => r.data);
export const crearAlumno     = (data)     => api.post('/alumnos', data).then(r => r.data);
export const updateAlumno    = (id, data) => api.put(`/alumnos/${id}`, data).then(r => r.data);
export const eliminarAlumno  = (id)       => api.delete(`/alumnos/${id}`);
export const subirFotoAlumno = (id, file) => {
  const fd = new FormData();
  fd.append('foto', file);
  return api.post(`/alumnos/${id}/foto`, fd).then(r => r.data);
};

// Tutores
export const getTutores      = (alumno_id) => api.get('/tutores', { params: { alumno_id } }).then(r => r.data);
export const crearTutor      = (data)      => api.post('/tutores', data).then(r => r.data);
export const updateTutor     = (id, data)  => api.put(`/tutores/${id}`, data).then(r => r.data);
export const eliminarTutor   = (id)        => api.delete(`/tutores/${id}`);

// Inscripciones
export const getInscripciones  = (params)   => api.get('/inscripciones', { params }).then(r => r.data);
export const crearInscripcion  = (data)     => api.post('/inscripciones', data).then(r => r.data);
export const updateInscripcion = (id, data) => api.put(`/inscripciones/${id}`, data).then(r => r.data);

// Documentos
export const getTiposDocumento  = ()            => api.get('/documentos-alumnos/tipos').then(r => r.data);
export const getDocumentosAlumno= (alumno_id)   => api.get('/documentos-alumnos', { params: { alumno_id } }).then(r => r.data);
export const subirDocumento     = (alumno_id, tipo_id, file) => {
  const fd = new FormData();
  fd.append('archivo', file);
  fd.append('alumno_id', alumno_id);
  fd.append('tipo_id', tipo_id);
  return api.post('/documentos-alumnos', fd).then(r => r.data);
};
export const eliminarDocumento  = (id) => api.delete(`/documentos-alumnos/${id}`);
