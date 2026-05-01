import api from './client';

export const getUsuarios    = ()         => api.get('/usuarios').then(r => r.data);
export const crearUsuario   = (data)     => api.post('/usuarios', data).then(r => r.data);
export const updateUsuario  = (id, data) => api.put(`/usuarios/${id}`, data).then(r => r.data);
export const eliminarUsuario= (id)       => api.delete(`/usuarios/${id}`);
