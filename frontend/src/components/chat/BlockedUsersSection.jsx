import { useState, useEffect } from 'react';
import api    from '../../api/axios';
import Avatar from '../ui/Avatar';

/*
 * BlockedUsersSection — Lista de usuarios bloqueados + botón desbloquear.
 *
 * CÓMO INSERTARLA en tu pantalla de Privacidad (la de la captura,
 * donde dice "Bloquear usuarios · Próximamente" bajo "PRÓXIMAMENTE"):
 *
 *   import BlockedUsersSection from './BlockedUsersSection';
 *
 *   // Reemplaza el bloque deshabilitado que dice "Bloquear usuarios"
 *   // (el que tiene la etiqueta "Pronto") por:
 *   <BlockedUsersSection />
 *
 * No necesita props. Se encarga de cargar y refrescar su propia lista.
 */

const BlockedUsersSection = () => {
  const [blocked,   setBlocked]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [unblocking,setUnblocking]= useState(null); // id del usuario en proceso

  const loadBlocked = () => {
    setLoading(true);
    setError('');
    api.get('/users/blocked')
      .then(({ data }) => setBlocked(data))
      .catch(() => setError('No se pudo cargar la lista de bloqueados'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBlocked();
  }, []);

  const handleUnblock = async (userId) => {
    setUnblocking(userId);
    try {
      await api.post(`/users/${userId}/unblock`);
      setBlocked((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      console.error('Error desbloqueando:', err);
      alert('No se pudo desbloquear al usuario');
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="bg-[#1a1a1f] border border-white/8 rounded-2xl overflow-hidden">

      <div className="px-5 py-4 border-b border-white/5">
        <p className="text-sm font-semibold text-white">Usuarios bloqueados</p>
        <p className="text-xs text-text-muted mt-1">
          No pueden escribirte ni ver tu foto de perfil actualizada.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <p className="text-xs text-accent-red text-center py-6 px-5">{error}</p>
      )}

      {!loading && !error && blocked.length === 0 && (
        <p className="text-xs text-text-muted text-center py-6 px-5">
          No has bloqueado a nadie todavía.
        </p>
      )}

      {!loading && !error && blocked.map((u) => (
        <div
          key={u._id}
          className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-b-0"
        >
          <Avatar user={{ ...u, avatarUrl: null }} size={36} />
          <p className="flex-1 text-sm text-text-primary truncate">{u.username}</p>
          <button
            onClick={() => handleUnblock(u._id)}
            disabled={unblocking === u._id}
            className="text-xs font-semibold text-accent hover:text-accent-bright transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {unblocking === u._id ? 'Desbloqueando...' : 'Desbloquear'}
          </button>
        </div>
      ))}
    </div>
  );
};

export default BlockedUsersSection;