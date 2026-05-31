import { useState, useEffect, useRef } from 'react';

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPVpRervXmpoKKWg'; // API key pública de demostración
const TENOR_API = 'https://tenor.googleapis.com/v2';

const GifPicker = ({ onSelect, onClose }) => {
  const [query,    setQuery]    = useState('');
  const [gifs,     setGifs]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const inputRef   = useRef(null);

  // Cargar GIFs trending al abrir
  useEffect(() => {
    fetchTrending();
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${TENOR_API}/featured?key=${TENOR_API_KEY}&limit=20&media_filter=gif`
      );
      const data = await res.json();
      setGifs(data.results ?? []);
    } catch (err) {
      console.error('Error cargando GIFs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSearch = async (q) => {
    if (!q.trim()) return fetchTrending();
    setLoading(true);
    try {
      const res = await fetch(
        `${TENOR_API}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(q)}&limit=20&media_filter=gif`
      );
      const data = await res.json();
      setGifs(data.results ?? []);
    } catch (err) {
      console.error('Error buscando GIFs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce búsqueda
  useEffect(() => {
    const timer = setTimeout(() => fetchSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const getGifUrl = (gif) =>
    gif.media_formats?.gif?.url ??
    gif.media_formats?.tinygif?.url ??
    '';

  const getPreviewUrl = (gif) =>
    gif.media_formats?.tinygif?.url ??
    gif.media_formats?.gif?.url ??
    '';

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="
        absolute bottom-full mb-2 left-0 z-50
        w-72 bg-panel border border-white/15
        rounded-2xl shadow-2xl overflow-hidden
      ">
        {/* Header + búsqueda */}
        <div className="p-3 border-b border-white/5">
          <div className="flex items-center gap-2 bg-input rounded-xl px-3 py-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-text-muted flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
              <button onClick={() => setQuery('')} className="text-text-muted hover:text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Grid de GIFs */}
        <div className="h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              No se encontraron GIFs
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => { onSelect(getGifUrl(gif)); onClose(); }}
                  className="relative aspect-video rounded-lg overflow-hidden hover:ring-2 hover:ring-accent transition-all bg-white/5"
                >
                  <img
                    src={getPreviewUrl(gif)}
                    alt={gif.content_description ?? 'GIF'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Tenor */}
        <div className="px-3 py-2 border-t border-white/5 flex justify-end">
          <span className="text-[10px] text-text-muted">Powered by Tenor</span>
        </div>
      </div>
    </>
  );
};

export default GifPicker;