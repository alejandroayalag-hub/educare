import api from './client';

export const getNotificaciones  = (params) => api.get('/notificaciones', { params }).then(r => r.data);
export const enviarNotificacion = (data)   => api.post('/notificaciones/enviar', data).then(r => r.data);
export const enviarMasivo       = (data)   => api.post('/notificaciones/masivo', data).then(r => r.data);
export const getWhatsappUrl     = (telefono, mensaje) =>
  api.get('/notificaciones/whatsapp-url', { params: { telefono, mensaje } }).then(r => r.data);
