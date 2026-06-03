import { useState, useEffect, useRef } from 'react';

const GIPHY_API = 'https://api.giphy.com/v1/gifs';

const GifPicker = ({ onSelect, onClose }) => {
  const [query,   setQuery]   = useState('');
  const [gifs,    setGifs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const inputRef = useRef(null);

  const API_KEY = import.meta.env.VITE_GIPHY_API_KEY;

  useEffect(() => {
    fetchTrending();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const fetchTrending = async () => {
    if (!API_KEY) { setError('Falta VITE_GIPHY_API_KEY en .env'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${GIPHY_API}/trending?api_key=${API_KEY}&limit=24&rating=g`);
      const data = await res.json();
      setGifs(data.data ?? []);
    } catch {
      setError('Error cargando GIFs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSearch = async (q) => {
    if (!q.trim()) return fetchTrending();
    if (!API_KEY)  { setError('Falta VITE_GIPHY_API_KEY en .env'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${GIPHY_API}/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`);
      const data = await res.json();
      setGifs(data.data ?? []);
    } catch {
      setError('Error buscando GIFs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchSearch(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const getUrl     = (gif) => gif?.images?.original?.url ?? '';
  const getPreview = (gif) => gif?.images?.fixed_height_small?.url ?? gif?.images?.original?.url ?? '';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-panel border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-white/5">
          <div className="flex items-center gap-2 bg-input rounded-xl px-3 py-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted flex-shrink-0">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar GIFs..."
              className="flex-1 bg-transparent text-sm text-white placeholder-text-muted outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-text-muted hover:text-white transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="px-3 pt-2 pb-1">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            {query.trim() ? `Resultados para "${query}"` : 'Tendencias'}
          </p>
        </div>

        <div className="h-60 overflow-y-auto px-2 pb-2">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-accent-red text-center px-4">{error}</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-text-muted">No se encontraron GIFs</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={(e) => { e.stopPropagation(); onSelect(getUrl(gif)); }}
                  className="relative aspect-video rounded-lg overflow-hidden bg-white/5 hover:ring-2 hover:ring-accent hover:scale-[1.02] transition-all"
                >
                  <img
                    src={getPreview(gif)}
                    alt={gif.title ?? 'GIF'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-2 border-t border-white/5 flex items-center justify-end gap-1">
          <span className="text-[10px] text-text-muted">Powered by</span>
          <span className="text-[10px] font-bold text-white">GIPHY</span>
        </div>
      </div>
    </>
  );
};

export default GifPicker;