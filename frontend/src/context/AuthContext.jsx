import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nexus_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    if (!token) { 
      setLoading(false); 
      return; 
    }
    
    // Timeout de 5 segundos para evitar que se cuelgue infinitamente
    const timeout = setTimeout(() => {
      console.warn('Auth check timeout - considerando sin sesión');
      setLoading(false);
    }, 5000);
    
    api.get('/auth/me')
      .then(({ data }) => {
        clearTimeout(timeout);
        setUser(data);
        localStorage.setItem('nexus_user', JSON.stringify(data));
        setLoading(false);
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error('Auth error:', error.message);
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_user');
        setUser(null);
        setLoading(false);
      });
  }, []);

  const login = useCallback((userData) => {
    const { token, ...rest } = userData;
    localStorage.setItem('nexus_token', token);
    localStorage.setItem('nexus_user', JSON.stringify(rest));
    setUser(rest);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('nexus_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);