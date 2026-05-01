import api from './client';

export const getCiclos      = ()         => api.get('/ciclos').then(r => r.data);
export const crearCiclo     = (data)     => api.post('/ciclos', data).then(r => r.data);
export const activarCiclo   = (id)       => api.put(`/ciclos/${id}/activar`).then(r => r.data);
export const eliminarCiclo  = (id)       => api.delete(`/ciclos/${id}`);
