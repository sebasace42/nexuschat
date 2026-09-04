import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
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
    const hasOwn = storyGroup?.statuses?.length > 0;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => (hasOwn ? onView() : onAdd())}
        onKeyDown={(e) => { if (e.key === 'Enter') (hasOwn ? onView() : onAdd()); }}
        className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
      >
        <div className="relative">
          <div className={`
            w-14 h-14 rounded-full p-0.5
            ${hasOwn
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
          {/* Botón + — siempre abre el creador para publicar uno nuevo,
              aunque ya tengas un estado activo (igual que WhatsApp/Instagram) */}
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            title="Añadir estado"
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent border-2 border-deep flex items-center justify-center"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <span className="text-[10px] text-text-muted truncate w-14 text-center">
          Mi estado
        </span>
      </div>
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
const StoryViewer = ({ storyGroup, onClose, onNext, onPrev, hasPrev, hasNext, isOwnViewer, onDeleted }) => {
  const { socket } = useSocket();
  const [idx, setIdx]                 = useState(0);
  const [progress, setProgress]       = useState(0);
  const [paused, setPaused]           = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText]     = useState('');
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);

  const videoRef  = useRef(null);
  const holdTimer = useRef(null);
  const isHoldRef = useRef(false);

  const story = storyGroup.statuses[idx];

  // Marcar como visto (nunca para tu propio estado)
  useEffect(() => {
    if (!story || isOwnViewer) return;
    api.post(`/status/${story._id}/view`).catch(() => {});
  }, [story?._id, isOwnViewer]);

  // Reinicia el progreso al cambiar de historia
  useEffect(() => { setProgress(0); }, [idx]);

  // Avanza a la siguiente historia / al siguiente contacto / cierra
  const advance = () => {
    if (idx < storyGroup.statuses.length - 1) {
      setIdx((i) => i + 1);
    } else if (hasNext) {
      onNext();
    } else {
      onClose();
    }
  };
  const goBack = () => {
    if (idx > 0) setIdx((i) => i - 1);
    else if (hasPrev) onPrev();
  };

  // Temporizador para texto/imagen (5s fijos). El video usa sus propios eventos
  // de reproducción real (onEnded), así dura lo que dura el video de verdad.
  useEffect(() => {
    if (story?.type === 'video') return;
    if (paused || showViewers) return;

    const DURATION_MS = 5000;
    const start = performance.now() - (progress / 100) * DURATION_MS;
    let raf;
    const tick = (now) => {
      const pct = Math.min(100, ((now - start) / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) advance();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, paused, showViewers, story?.type]);

  // Reproduce/pausa el <video> real según el estado de pausa
  useEffect(() => {
    if (story?.type !== 'video') return;
    const v = videoRef.current;
    if (!v) return;
    if (paused || showViewers) v.pause();
    else v.play().catch(() => {});
  }, [paused, showViewers, story?.type, idx]);

  // Mantener presionado = pausar (no navega al soltar). Toque rápido = navega.
  const handlePointerDown = () => {
    isHoldRef.current = false;
    holdTimer.current = setTimeout(() => {
      isHoldRef.current = true;
      setPaused(true);
    }, 180);
  };
  const handlePointerUp = (navigateFn) => {
    clearTimeout(holdTimer.current);
    if (isHoldRef.current) setPaused(false);
    else navigateFn();
  };
  const handlePointerCancel = () => {
    clearTimeout(holdTimer.current);
    if (isHoldRef.current) setPaused(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/status/${story._id}`);
      onDeleted?.(story.user._id, story._id);
      if (storyGroup.statuses.length === 1) onClose();
      else if (idx > 0) setIdx((i) => i - 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const { data: conversation } = await api.post('/conversations', {
        recipientId: story.user._id,
      });
      socket?.emit('message:send', {
        conversationId: conversation._id,
        text: replyText.trim(),
        statusReply: {
          statusId: story._id,
          type:     story.type,
          text:     story.type === 'text' ? story.text : (story.text || ''),
          bgColor:  story.bgColor || null,
          mediaUrl: story.mediaUrl || null,
        },
      });
      setReplyText('');
      setSent(true);
      setTimeout(() => setSent(false), 1800);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
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
          <video
            ref={videoRef}
            src={story.mediaUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            onTimeUpdate={(e) => {
              const v = e.target;
              if (v.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
            onEnded={advance}
          />
        ) : null}

        {/* Caption en media */}
        {story?.type !== 'text' && story?.text && (
          <div className="absolute bottom-24 left-0 right-0 px-6">
            <p className="text-white text-base text-center bg-black/40 rounded-xl px-4 py-2">
              {story.text}
            </p>
          </div>
        )}

        {/* Overlay superior */}
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent pb-8 z-20">
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
            {isOwnViewer && (
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

        {/* Mantener presionado para pausar, tocar para navegar */}
        <div className="absolute inset-0 flex z-10">
          <div
            className="flex-1"
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onMouseUp={() => handlePointerUp(goBack)}
            onTouchEnd={() => handlePointerUp(goBack)}
            onMouseLeave={handlePointerCancel}
          />
          <div
            className="flex-1"
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onMouseUp={() => handlePointerUp(advance)}
            onTouchEnd={() => handlePointerUp(advance)}
            onMouseLeave={handlePointerCancel}
          />
        </div>

        {/* Vistas (solo estado propio) — toca para ver quién lo vio */}
        {isOwnViewer && (
          <button
            onClick={() => setShowViewers(true)}
            className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white/70 hover:text-white z-20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span className="text-sm">{story?.views?.length || 0}</span>
          </button>
        )}

        {/* Responder al estado (solo si no es el tuyo) */}
        {!isOwnViewer && (
          <form
            onSubmit={handleReply}
            className="absolute bottom-0 inset-x-0 p-3 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent z-20"
          >
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder={`Responder a ${story?.user?.username}...`}
              className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/40"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || sending}
              className="w-10 h-10 rounded-full bg-accent flex items-center justify-center disabled:opacity-30 flex-shrink-0"
            >
              {sent ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </form>
        )}

        {/* Panel de quién vio tu estado */}
        {showViewers && isOwnViewer && (
          <ViewersPanel story={story} onClose={() => setShowViewers(false)} />
        )}
      </div>

      {/* Botones prev/next entre usuarios */}
      {hasPrev && (
        <button onClick={onPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-20">
          ‹
        </button>
      )}
      {hasNext && (
        <button onClick={onNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-20">
          ›
        </button>
      )}
    </div>
  );
};

// ── Panel de "quién vio tu estado" ─────────────────────────────────
const ViewersPanel = ({ story, onClose }) => {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/status/${story._id}/viewers`)
      .then(({ data }) => { if (active) setViewers(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [story._id]);

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 bg-panel rounded-t-2xl max-h-[60%] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <p className="text-sm font-semibold text-white">Visto por {viewers.length}</p>
        <button onClick={onClose} className="text-text-muted hover:text-white p-1">✕</button>
      </div>
      <div className="overflow-y-auto px-4 py-2">
        {loading ? (
          <p className="text-xs text-text-muted py-4 text-center">Cargando...</p>
        ) : viewers.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">Nadie ha visto tu estado todavía</p>
        ) : (
          viewers.map((v) => (
            <div key={v.user._id} className="flex items-center gap-3 py-2">
              <Avatar user={v.user} size={32} />
              <span className="text-sm text-white flex-1">{v.user.username}</span>
              <span className="text-[10px] text-text-muted">
                {new Date(v.viewedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
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
  const [error, setError]     = useState('');

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB, igual que el límite del backend

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_SIZE) {
      setError('El archivo pesa más de 50MB. Elige uno más liviano.');
      e.target.value = '';
      return;
    }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setTab('media');
  };

  const handleCreate = async () => {
    setError('');
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
      setError(
        err.response?.data?.message ||
        'No se pudo publicar el estado. Revisa tu conexión e intenta de nuevo.'
      );
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

          {/* Mensaje de error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
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
  const { user }   = useAuth();
  const { socket } = useSocket();
  const [groups,       setGroups]       = useState([]);
  const [viewingIdx,   setViewingIdx]   = useState(null);
  const [viewingOwn,   setViewingOwn]   = useState(false);
  const [showCreator,  setShowCreator]  = useState(false);

  useEffect(() => { fetchStatuses(); }, []);

  // Quita un estado de la lista local (usado tanto por el evento de socket
  // como cuando TÚ borras tu propio estado, ya que no te llega tu propio evento)
  const removeStatusFromGroups = (userId, statusId) => {
    setGroups((prev) =>
      prev
        .map((g) => g.user._id === userId
          ? { ...g, statuses: g.statuses.filter((s) => s._id !== statusId) }
          : g)
        .filter((g) => g.statuses.length > 0)
    );
  };

  // Tiempo real: cuando un contacto (o uno mismo desde otra pestaña)
  // publica un estado nuevo, el backend emite 'status:new'. Sin este
  // listener el estado solo aparecía tras recargar toda la app.
  useEffect(() => {
    if (!socket) return;

    const onNewStatus = ({ status }) => {
      setGroups((prev) => {
        const uid = status.user._id;
        const isOwn = uid === user?._id;
        const existingIdx = prev.findIndex((g) => g.user._id === uid);

        if (existingIdx === -1) {
          const newGroup = { user: status.user, statuses: [status], hasNew: !isOwn };
          return [...prev, newGroup];
        }

        return prev.map((g, i) => {
          if (i !== existingIdx) return g;
          return {
            ...g,
            statuses: [status, ...g.statuses],
            hasNew: isOwn ? g.hasNew : true,
          };
        });
      });
    };

    const onDeletedStatus = ({ statusId, userId }) => {
      removeStatusFromGroups(userId, statusId);
    };

    socket.on('status:new', onNewStatus);
    socket.on('status:deleted', onDeletedStatus);
    return () => {
      socket.off('status:new', onNewStatus);
      socket.off('status:deleted', onDeletedStatus);
    };
  }, [socket, user]);

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

  const handleCreated = () => {
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
            onView={() => setViewingOwn(true)}
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

      {/* Visor: mi propio estado */}
      {viewingOwn && ownGroup && (
        <StoryViewer
          storyGroup={ownGroup}
          onClose={() => setViewingOwn(false)}
          hasPrev={false}
          hasNext={false}
          onPrev={() => {}}
          onNext={() => {}}
          isOwnViewer
          onDeleted={removeStatusFromGroups}
        />
      )}

      {/* Visor: estados de contactos */}
      {viewingIdx !== null && otherGroups[viewingIdx] && (
        <StoryViewer
          storyGroup={otherGroups[viewingIdx]}
          onClose={() => setViewingIdx(null)}
          hasPrev={viewingIdx > 0}
          hasNext={viewingIdx < otherGroups.length - 1}
          onPrev={() => setViewingIdx((i) => i - 1)}
          onNext={() => setViewingIdx((i) => i + 1)}
          isOwnViewer={false}
          onDeleted={removeStatusFromGroups}
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