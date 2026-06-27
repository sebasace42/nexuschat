import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: window.location.hostname === 'localhost'
    ? '/api'
    : BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo redirige a login si el usuario intenta acceder a rutas protegidas
    // No redirige en /auth/me para evitar loop infinito
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;