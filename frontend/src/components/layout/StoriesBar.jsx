import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';

// ── Colores disponibles para estados de texto ─────────────────────
const BG_COLORS = [
  '#5b4fcf', '#1d9e75', '#d85a30', '#d4537e',
  '#378add', '#ba7517', '#639922', '#1a1a2e',
];

// ── Componente círculo de historia ────────────────────────────────
const StoryCircle = ({ storyGroup, isOwn, onView, onAdd }) => {
  const hasNew = storyGroup?.hasNew;
  const user   = storyGroup?.user;

  if (isOwn) {
    return (
      <button
        onClick={onAdd}
        className="flex flex-col items-center gap-1 flex-shrink-0"
      >
        <div className="relative">
          <div className={`
            w-14 h-14 rounded-full p-0.5
            ${storyGroup?.statuses?.length > 0
              ? hasNew
                ? 'bg-gradient-to-tr from-accent to-accent-bright'
                : 'bg-white/20'
              : 'bg-white/10'
            }
          `}>
            <div className="w-full h-full rounded-full overflow-hidden bg-deep">
              <Avatar user={user} size={52} />
            </div>
          </div>
          {/* Botón + */}
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent border-2 border-deep flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        </div>
        <span className="text-[10px] text-text-muted truncate w-14 text-center">
          Mi estado
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onView(storyGroup)}
      className="flex flex-col items-center gap-1 flex-shrink-0"
    >
      <div className={`
        w-14 h-14 rounded-full p-0.5
        ${hasNew
          ? 'bg-gradient-to-tr from-accent to-purple-400'
          : 'bg-white/20'
        }
      `}>
        <div className="w-full h-full rounded-full overflow-hidden bg-deep">
          <Avatar user={user} size={52} />
        </div>
      </div>
      <span className="text-[10px] text-text-muted truncate w-14 text-center">
        {user?.username}
      </span>
    </button>
  );
};

// ── Visor de historia ─────────────────────────────────────────────
const StoryViewer = ({ storyGroup, onClose, onNext, onPrev, hasPrev, hasNext }) => {
  const { user: me } = useAuth();
  const [idx, setIdx]       = useState(0);
  const [progress, setProgress] = useState(0);
  const story = storyGroup.statuses[idx];

  // Marcar como visto
  useEffect(() => {
    if (!story) return;
    api.post(`/status/${story._id}/view`).catch(() => {});
  }, [story?._id]);

  // Barra de progreso automática (5s por historia)
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          // Avanzar a la siguiente historia del mismo usuario
          if (idx < storyGroup.statuses.length - 1) {
            setIdx((i) => i + 1);
          } else if (hasNext) {
            onNext();
          } else {
            onClose();
          }
          return 0;
        }
        return p + (100 / 50); // 5s = 50 ticks de 100ms
      });
    }, 100);
    return () => clearInterval(interval);
  }, [idx, story?._id]);

  const isOwn = story?.user?._id === me?._id;

  const handleDelete = async () => {
    await api.delete(`/status/${story._id}`);
    if (storyGroup.statuses.length === 1) {
      onClose();
    } else if (idx > 0) {
      setIdx(idx - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Contenido de la historia */}
      <div className="relative w-full max-w-sm h-full max-h-[700px] rounded-2xl overflow-hidden">

        {/* Fondo */}
        {story?.type === 'text' ? (
          <div
            className="absolute inset-0 flex items-center justify-center p-8"
            style={{ backgroundColor: story.bgColor || '#5b4fcf' }}
          >
            <p className="text-white text-2xl font-semibold text-center leading-relaxed">
              {story.text}
            </p>
          </div>
        ) : story?.type === 'image' ? (
          <img src={story.mediaUrl} className="absolute inset-0 w-full h-full object-cover" alt="" />
        ) : story?.type === 'video' ? (
          <video src={story.mediaUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted />
        ) : null}

        {/* Caption en media */}
        {story?.type !== 'text' && story?.text && (
          <div className="absolute bottom-16 left-0 right-0 px-6">
            <p className="text-white text-base text-center bg-black/40 rounded-xl px-4 py-2">
              {story.text}
            </p>
          </div>
        )}

        {/* Overlay superior */}
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent pb-8">
          {/* Barras de progreso */}
          <div className="flex gap-1 px-3 pt-3">
            {storyGroup.statuses.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          {/* Header usuario */}
          <div className="flex items-center gap-3 px-4 pt-3">
            <div className="w-9 h-9 rounded-full overflow-hidden">
              <Avatar user={story?.user} size={36} />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">{story?.user?.username}</p>
              <p className="text-white/60 text-xs">
                {story?.createdAt ? new Date(story.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
            </div>
            {isOwn && (
              <button onClick={handleDelete} className="text-white/70 hover:text-white p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 6V4h4v2"/>
                </svg>
              </button>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tocar izquierda/derecha para navegar */}
        <div className="absolute inset-0 flex">
          <div className="flex-1" onClick={() => {
            if (idx > 0) setIdx(idx - 1);
            else if (hasPrev) onPrev();
          }} />
          <div className="flex-1" onClick={() => {
            if (idx < storyGroup.statuses.length - 1) setIdx(idx + 1);
            else if (hasNext) onNext();
            else onClose();
          }} />
        </div>

        {/* Vistas (solo estado propio) */}
        {isOwn && (
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white/70">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span className="text-sm">{story?.views?.length || 0}</span>
          </div>
        )}
      </div>

      {/* Botones prev/next entre usuarios */}
      {hasPrev && (
        <button onClick={onPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
          ‹
        </button>
      )}
      {hasNext && (
        <button onClick={onNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
          ›
        </button>
      )}
    </div>
  );
};

// ── Creador de historia ───────────────────────────────────────────
const StoryCreator = ({ onClose, onCreated }) => {
  const [tab, setTab]         = useState('text'); // 'text' | 'media'
  const [text, setText]       = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setTab('media');
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      if (tab === 'text') {
        if (!text.trim()) return;
        const { data } = await api.post('/status/text', { text, bgColor });
        onCreated(data);
      } else {
        if (!file) return;
        const form = new FormData();
        form.append('file', file);
        if (text.trim()) form.append('text', text);
        const { data } = await api.post('/status/media', form);
        onCreated(data);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-end md:items-center justify-center">
      <div className="w-full max-w-sm bg-panel rounded-t-2xl md:rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-display text-base font-bold text-white">Añadir estado</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setTab('text')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'text' ? 'text-accent border-b-2 border-accent' : 'text-text-muted'}`}
          >
            ✏️ Texto
          </button>
          <button
            onClick={() => setTab('media')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'media' ? 'text-accent border-b-2 border-accent' : 'text-text-muted'}`}
          >
            🖼️ Foto/Video
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview del estado de texto */}
          {tab === 'text' && (
            <div
              className="w-full h-32 rounded-xl flex items-center justify-center p-4 transition-colors"
              style={{ backgroundColor: bgColor }}
            >
              <p className="text-white text-center text-sm font-medium">
                {text || 'Vista previa...'}
              </p>
            </div>
          )}

          {/* Preview media */}
          {tab === 'media' && preview && (
            <div className="w-full h-40 rounded-xl overflow-hidden bg-black">
              {file?.type.startsWith('video/') ? (
                <video src={preview} className="w-full h-full object-contain" controls />
              ) : (
                <img src={preview} className="w-full h-full object-contain" alt="" />
              )}
            </div>
          )}

          {/* Input texto */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tab === 'text' ? 'Escribe tu estado...' : 'Añadir caption (opcional)'}
            maxLength={tab === 'text' ? 700 : 200}
            rows={tab === 'text' ? 3 : 2}
            className="w-full bg-input border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-accent placeholder-text-muted"
          />

          {/* Paleta de colores (solo texto) */}
          {tab === 'text' && (
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full transition-transform ${bgColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-panel scale-110' : 'hover:scale-105'}`}
                />
              ))}
            </div>
          )}

          {/* Selector de archivo */}
          {tab === 'media' && (
            <label className="block w-full py-3 rounded-xl border border-dashed border-white/20 text-center text-sm text-text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer">
              {file ? '📁 Cambiar archivo' : '📁 Seleccionar foto o video'}
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
            </label>
          )}

          {/* Botón crear */}
          <button
            onClick={handleCreate}
            disabled={loading || (tab === 'text' && !text.trim()) || (tab === 'media' && !file)}
            className="w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Publicando...' : 'Publicar estado'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Componente principal StoriesBar ───────────────────────────────
const StoriesBar = () => {
  const { user } = useAuth();
  const [groups,       setGroups]       = useState([]);
  const [viewingIdx,   setViewingIdx]   = useState(null);
  const [showCreator,  setShowCreator]  = useState(false);

  useEffect(() => { fetchStatuses(); }, []);

  const fetchStatuses = async () => {
    try {
      const { data } = await api.get('/status');
      setGroups(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Separar el propio usuario del resto
  const ownGroup   = groups.find((g) => g.user._id === user?._id);
  const otherGroups = groups.filter((g) => g.user._id !== user?._id);

  const handleCreated = (newStatus) => {
    fetchStatuses(); // refrescar
  };

  return (
    <>
      <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 px-1">Estados</p>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {/* Mi historia */}
          <StoryCircle
            isOwn
            storyGroup={ownGroup}
            onAdd={() => setShowCreator(true)}
          />

          {/* Historias de contactos */}
          {otherGroups.map((g, i) => (
            <StoryCircle
              key={g.user._id}
              storyGroup={g}
              onView={() => setViewingIdx(i)}
            />
          ))}
        </div>
      </div>

      {/* Visor */}
      {viewingIdx !== null && otherGroups[viewingIdx] && (
        <StoryViewer
          storyGroup={otherGroups[viewingIdx]}
          onClose={() => setViewingIdx(null)}
          hasPrev={viewingIdx > 0}
          hasNext={viewingIdx < otherGroups.length - 1}
          onPrev={() => setViewingIdx((i) => i - 1)}
          onNext={() => setViewingIdx((i) => i + 1)}
        />
      )}

      {/* Creador */}
      {showCreator && (
        <StoryCreator
          onClose={() => setShowCreator(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
};

export default StoriesBar;