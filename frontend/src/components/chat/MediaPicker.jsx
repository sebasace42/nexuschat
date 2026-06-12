import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const GIPHY_API = 'https://api.giphy.com/v1/gifs';

// ── Emojis por categoría ──────────────────────────────────────────
const EMOJI_CATS = [
  { icon: '🕐', label: 'Recientes', key: 'recent' },
  { icon: '😀', label: 'Caritas',   key: 'faces'  },
  { icon: '🐶', label: 'Animales',  key: 'animals'},
  { icon: '🍕', label: 'Comida',    key: 'food'   },
  { icon: '⚽', label: 'Deporte',   key: 'sport'  },
  { icon: '✈️', label: 'Viajes',    key: 'travel' },
  { icon: '💡', label: 'Objetos',   key: 'objects'},
  { icon: '❤️', label: 'Símbolos',  key: 'symbols'},
];

const EMOJIS = {
  recent:  ['😂','❤️','👍','🔥','😭','🥰','😍','🤣','😊','🙏','💯','😅','👏','🎉','✅','⚡'],
  faces:   ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','🥰','😍','🤩','😘',
             '😗','😙','😚','🙂','🤗','🤭','🤫','🤔','😐','😑','😶','🙄','😏','😒','😞','😔',
             '😟','😕','🙃','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳'],
  animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
             '🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋'],
  food:    ['🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍆',
             '🥕','🌽','🌶️','🥦','🧄','🧅','🥔','🍠','🥐','🥖','🥨','🧀','🥚','🍳','🧈','🥞'],
  sport:   ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥍','🏑','🏏',
             '🪃','🥅','⛳','🎣','🤿','🎽','🎿','🛷','🥌','🪁','🏹','🎯','🪀','🎮','🎲','♟️'],
  travel:  ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵',
             '🚲','🛴','🛹','🚁','✈️','🛸','🚀','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🗺️'],
  objects: ['💡','🔦','🕯️','💰','💳','💎','⚖️','🔧','🔨','⚙️','🔩','🪛','🔑','🗝️','🔐','🔒',
             '📱','💻','⌨️','🖥️','🖨️','🖱️','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📺','📻'],
  symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
             '💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🔯','🪯','☯️','✅','❌','⭕','🔴','🟠'],
};

// ── Stickers (usando GIPHY stickers API) ──────────────────────────
const STICKER_PACKS = [
  { id: 'trending', label: '🌟 Populares' },
  { id: 'cats',     label: '🐱 Gatos'     },
  { id: 'dogs',     label: '🐶 Perros'    },
  { id: 'love',     label: '❤️ Amor'      },
  { id: 'funny',    label: '😂 Gracioso'  },
  { id: 'sad',      label: '😢 Triste'    },
];

// ── Componente principal ──────────────────────────────────────────
const MediaPicker = ({ onSelectEmoji, onSelectGif, onSelectSticker, onClose, anchorRef }) => {
  const [tab,        setTab]        = useState('emoji');   // 'emoji' | 'gif' | 'sticker'
  const [emojiCat,   setEmojiCat]   = useState('recent');
  const [gifQuery,   setGifQuery]   = useState('');
  const [gifs,       setGifs]       = useState([]);
  const [stickers,   setStickers]   = useState([]);
  const [stickerPack,setStickerPack]= useState('trending');
  const [loading,    setLoading]    = useState(false);
  const [pos,        setPos]        = useState({ bottom: 80, left: 0 });
  const panelRef   = useRef(null);
  const gifInputRef= useRef(null);
  const API_KEY    = import.meta.env.VITE_GIPHY_API_KEY;

  // Calcular posición
  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const panelH = 420;
      const spaceAbove = rect.top;
      setPos({
        bottom: window.innerHeight - rect.top + 8,
        left:   Math.min(rect.left, window.innerWidth - 300),
      });
    }
  }, []);

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Cargar GIFs
  const fetchGifs = async (q = '') => {
    if (!API_KEY) return;
    setLoading(true);
    try {
      const endpoint = q.trim()
        ? `${GIPHY_API}/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`
        : `${GIPHY_API}/trending?api_key=${API_KEY}&limit=24&rating=g`;
      const res  = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.data ?? []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  // Cargar Stickers
  const fetchStickers = async (pack = 'trending') => {
    if (!API_KEY) return;
    setLoading(true);
    try {
      const endpoint = pack === 'trending'
        ? `https://api.giphy.com/v1/stickers/trending?api_key=${API_KEY}&limit=24&rating=g`
        : `https://api.giphy.com/v1/stickers/search?api_key=${API_KEY}&q=${encodeURIComponent(pack)}&limit=24&rating=g`;
      const res  = await fetch(endpoint);
      const data = await res.json();
      setStickers(data.data ?? []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'gif')     { fetchGifs(); setTimeout(() => gifInputRef.current?.focus(), 50); }
    if (tab === 'sticker') fetchStickers('trending');
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => { if (tab === 'gif') fetchGifs(gifQuery); }, 400);
    return () => clearTimeout(t);
  }, [gifQuery]);

  useEffect(() => {
    if (tab === 'sticker') fetchStickers(stickerPack);
  }, [stickerPack]);

  const getGifUrl     = (g) => g?.images?.original?.url ?? '';
  const getGifPreview = (g) => g?.images?.fixed_height_small?.url ?? g?.images?.original?.url ?? '';

  const panel = (
    <div
      ref={panelRef}
      style={{ position: 'fixed', bottom: pos.bottom, left: pos.left, zIndex: 9999 }}
      className="w-80 bg-panel border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ position: 'fixed', bottom: `${pos.bottom}px`, left: `${pos.left}px`, zIndex: 9999, height: '420px' }}
    >
      {/* ── TABS ── */}
      <div className="flex items-center border-b border-white/5 px-2 pt-2 gap-1 flex-shrink-0">
        {[
          { id: 'emoji',   icon: '😊', label: 'Emoji'    },
          { id: 'gif',     icon: null,  label: 'GIF'      },
          { id: 'sticker', icon: '🎨',  label: 'Stickers' },
        ].map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors
              ${tab === id
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-primary hover:bg-hover'}
            `}
          >
            {icon && <span>{icon}</span>}
            {id === 'gif' && (
              <span className="text-xs font-bold tracking-wide">GIF</span>
            )}
            {id !== 'gif' && <span className="text-xs">{label}</span>}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-hover transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── TAB EMOJI ── */}
      {tab === 'emoji' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Grid emojis */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-8 gap-0.5">
              {(EMOJIS[emojiCat] || EMOJIS.recent).map((emoji) => (
                <button
                  key={emoji}
                  onMouseDown={(e) => { e.preventDefault(); onSelectEmoji(emoji); }}
                  className="w-8 h-8 flex items-center justify-center text-xl hover:bg-hover rounded-lg transition-colors active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          {/* Categorías */}
          <div className="flex border-t border-white/5 px-1 py-1 gap-0.5 flex-shrink-0 overflow-x-auto">
            {EMOJI_CATS.map(({ icon, key }) => (
              <button
                key={key}
                onClick={() => setEmojiCat(key)}
                className={`
                  w-9 h-9 flex-shrink-0 flex items-center justify-center text-base rounded-xl transition-colors
                  ${emojiCat === key ? 'bg-accent/20' : 'hover:bg-hover'}
                `}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB GIF ── */}
      {tab === 'gif' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Búsqueda */}
          <div className="p-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-input rounded-xl px-3 py-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted flex-shrink-0">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={gifInputRef}
                type="text"
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                placeholder="Buscar GIFs..."
                className="flex-1 bg-transparent text-sm text-white placeholder-text-muted outline-none"
              />
              {gifQuery && (
                <button onClick={() => setGifQuery('')} className="text-text-muted hover:text-white">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          {/* Grid GIFs */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelectGif(getGifUrl(gif)); onClose(); }}
                    className="relative aspect-video rounded-lg overflow-hidden bg-white/5 hover:ring-2 hover:ring-accent transition-all"
                  >
                    <img src={getGifPreview(gif)} alt={gif.title ?? 'GIF'} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="px-3 py-1.5 border-t border-white/5 flex justify-end flex-shrink-0">
            <span className="text-[10px] text-text-muted">Powered by <b>GIPHY</b></span>
          </div>
        </div>
      )}

      {/* ── TAB STICKERS ── */}
      {tab === 'sticker' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Packs */}
          <div className="flex gap-1.5 px-2 py-2 overflow-x-auto flex-shrink-0 border-b border-white/5">
            {STICKER_PACKS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setStickerPack(id)}
                className={`
                  whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0
                  ${stickerPack === id
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-text-muted hover:bg-white/10'}
                `}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Grid stickers */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {stickers.map((s) => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectSticker(s?.images?.original?.url ?? '');
                      onClose();
                    }}
                    className="aspect-square rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 hover:scale-105 transition-all p-1"
                  >
                    <img
                      src={s?.images?.fixed_height_small?.url ?? s?.images?.original?.url ?? ''}
                      alt={s.title ?? 'sticker'}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="px-3 py-1.5 border-t border-white/5 flex justify-end flex-shrink-0">
            <span className="text-[10px] text-text-muted">Powered by <b>GIPHY</b></span>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(panel, document.body);
};

export default MediaPicker;