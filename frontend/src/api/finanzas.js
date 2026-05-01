import api from './client';

export const getResumenFinanzas = (mes, anio) => api.get('/finanzas/resumen', { params: { mes, anio } }).then(r => r.data);
export const getEgresos         = (params)    => api.get('/finanzas/egresos', { params }).then(r => r.data);
export const crearEgreso        = (data)      => api.post('/finanzas/egresos', data).then(r => r.data);
export const updateEgreso       = (id, data)  => api.put(`/finanzas/egresos/${id}`, data).then(r => r.data);
export const eliminarEgreso     = (id)        => api.delete(`/finanzas/egresos/${id}`);
