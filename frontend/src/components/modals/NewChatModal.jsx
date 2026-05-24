import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import Avatar from '../ui/Avatar';

const NewChatModal = ({ onClose, onSelectConversation }) => {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/users/search?q=${query}`);
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = async (userId) => {
    try {
      const { data } = await api.post('/conversations', { recipientId: userId });
      onSelectConversation(data);
      onClose();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-panel border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display text-lg font-bold text-white">Nuevo mensaje</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">✕</button>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 bg-input rounded-xl px-4 py-3 border border-white/5 focus-within:border-accent/40 transition-colors">
            <span className="text-text-muted text-sm">🔍</span>
            <input ref={inputRef} value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por usuario o email..."
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted text-sm outline-none"
            />
            {loading && <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />}
          </div>
        </div>
        <div className="px-3 pb-4 max-h-72 overflow-y-auto">
          {results.length === 0 && query.trim() && !loading && (
            <p className="text-center text-text-muted text-sm py-8">No se encontraron usuarios</p>
          )}
          {results.length === 0 && !query.trim() && (
            <p className="text-center text-text-muted text-sm py-8">Escribe para buscar usuarios</p>
          )}
          {results.map((u) => (
            <button key={u._id} onClick={() => handleSelect(u._id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-hover transition-colors text-left">
              <Avatar user={u} size={38} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{u.username}</p>
                <p className="text-xs text-text-muted truncate">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default NewChatModal;