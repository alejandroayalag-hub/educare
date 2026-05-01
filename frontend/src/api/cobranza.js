import api from './client';

// Conceptos de pago
export const getConceptos     = (activo)     => api.get('/conceptos-pago', { params: activo !== undefined ? { activo } : {} }).then(r => r.data);
export const crearConcepto    = (data)       => api.post('/conceptos-pago', data).then(r => r.data);
export const updateConcepto   = (id, data)   => api.put(`/conceptos-pago/${id}`, data).then(r => r.data);
export const eliminarConcepto = (id)         => api.delete(`/conceptos-pago/${id}`);

// Cargos
export const getCargos        = (params)     => api.get('/cargos', { params }).then(r => r.data);
export const crearCargo       = (data)       => api.post('/cargos', data).then(r => r.data);
export const crearCargoMasivo = (data)       => api.post('/cargos/masivo', data).then(r => r.data);
export const updateCargo      = (id, data)   => api.put(`/cargos/${id}`, data).then(r => r.data);
export const eliminarCargo    = (id)         => api.delete(`/cargos/${id}`);

// Pagos
export const getPagos         = (params)     => api.get('/pagos', { params }).then(r => r.data);
export const registrarPago    = (data)       => api.post('/pagos', data).then(r => r.data);
export const crearPreferenciaMP = (data)     => api.post('/pagos/mp/preferencia', data).then(r => r.data);
export const getResumenDia    = (fecha)      => api.get('/pagos/resumen-dia', { params: fecha ? { fecha } : {} }).then(r => r.data);
export const generarCorte     = (data)       => api.post('/pagos/corte', data).then(r => r.data);
export const getCortes        = ()           => api.get('/pagos/cortes').then(r => r.data);
