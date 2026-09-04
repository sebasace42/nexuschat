import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: window.location.hostname === 'localhost'
    ? '/api'
    : BACKEND_URL,
  // OJO: no fijar aquí 'Content-Type': 'application/json'.
  // Si se fija a nivel de instancia, axios lo respeta incluso cuando
  // el body es un FormData (subida de fotos/videos de estados), y en
  // vez de dejar que el navegador arme el multipart/form-data con su
  // boundary, convierte el FormData a JSON y rompe la subida de archivos.
  // Dejando esto sin definir, axios pone 'application/json' automáticamente
  // para objetos normales, y 'multipart/form-data; boundary=...' automáticamente
  // cuando el body es FormData.
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