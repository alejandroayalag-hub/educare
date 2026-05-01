import axios from 'axios';

export const login = (email, password) =>
  axios.post('/api/auth/login', { email, password }).then(r => r.data);

export const getEscuelaPublica = () =>
  axios.get('/api/escuela/publica').then(r => r.data);
