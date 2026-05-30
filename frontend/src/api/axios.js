import axios from 'axios';
 
const BACKEND_URL = 'https://nexuschat-hgos.onrender.com/api';
 
const api = axios.create({
  baseURL: window.location.hostname === 'localhost'
    ? '/api'
    : BACKEND_URL,
  // ── SIN Content-Type fijo ─────────────────────────────────────
  // Axios lo pone automáticamente:
  // → 'application/json'      para objetos normales
  // → 'multipart/form-data'   para FormData (subida de archivos)
  // Si lo forzamos a 'application/json' Cloudinary rechaza los archivos
});
 
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
 
export default api;