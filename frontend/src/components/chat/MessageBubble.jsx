import { useState, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Avatar from '../ui/Avatar';
import { useToast } from '../ui/ToastContext';
import DeleteMessagesModal from '../modals/DeleteMessagesModal';

const QUICK_EMOJIS = ['👍','❤️','😂','🔥','😮','👏'];

// ── Íconos de estado (doble check) ───────────────────────────────
const IconSent = () => (
  <svg width="15" height="10" viewBox="0 0 16 11" fill="none">
    <path d="M1 5.5L5.5 10L15 1" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconDelivered = () => (
  <svg width="17" height="10" viewBox="0 0 18 11" fill="none">
    <path d="M1 5.5L5.5 10L15 1" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 5.5L8.5 10L18 1" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconRead = () => (
  <svg width="17" height="10" viewBox="0 0 18 11" fill="none">
    <path d="M1 5.5L5.5 10L15 1" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 5.5L8.5 10L18 1" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const MessageStatus = ({ status }) => {
  if (status === 'read')      return <IconRead />;
  if (status === 'delivered') return <IconDelivered />;
  return <IconSent />;
};

// ── Formatear tamaño de archivo ──────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Vista previa del estado al que se respondió ──────────────────
const StatusReplyPreview = ({ statusReply, isOwn }) => {
  // Se exige statusId (no solo que el objeto exista) porque mensajes
  // guardados antes de este fix pueden tener el objeto "vacío" en la
  // base de datos (statusId: null) — así tampoco se muestran esos.
  if (!statusReply?.statusId) return null;
  return (
    <div className={`
      flex items-center gap-2 mx-2 mt-2 mb-1 p-1.5 rounded-lg
      border-l-2 border-accent-bright
      ${isOwn ? 'bg-black/15' : 'bg-black/20'}
    `}>
      <div className="w-9 h-11 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ backgroundColor: statusReply.type === 'text' ? (statusReply.bgColor || '#5b4fcf') : '#00000055' }}
      >
        {statusReply.type === 'text' ? (
          <span className="text-[7px] text-white text-center px-0.5 leading-tight line-clamp-3">
            {statusReply.text}
          </span>
        ) : statusReply.mediaUrl ? (
          statusReply.type === 'video' ? (
            <video src={statusReply.mediaUrl} className="w-full h-full object-cover" muted />
          ) : (
            <img src={statusReply.mediaUrl} className="w-full h-full object-cover" alt="" />
          )
        ) : null}
      </div>
      <p className="text-[11px] opacity-70 leading-tight">
        {isOwn ? 'Respondiste a su estado' : 'Respondió a tu estado'}
      </p>
    </div>
  );
};

// ── Reproductor de audio estilo WhatsApp ─────────────────────────
const AudioPlayer = ({ src, isOwn }) => {
  const audioRef              = useRef(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current,  setCurrent]  = useState(0);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m   = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else         { a.play();  setPlaying(true);  }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    const a    = audioRef.current;
    if (a && a.duration) {
      a.currentTime = pct * a.duration;
      setProgress(pct * 100);
    }
  };

  // Barras de onda decorativas (estilo WhatsApp)
  const bars = [3,5,8,5,9,6,4,7,9,5,8,4,6,9,5,7,4,8,6,9,5,4,7,8,5,6,9,4,7,5];

  return (
    <div className={`
      flex items-center gap-2.5 px-3 py-2.5 rounded-2xl
      min-w-[220px] max-w-[260px] w-full
      ${isOwn ? 'bg-white/10' : 'bg-white/5'}
    `}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={(e) => {
          const a = e.target;
          setCurrent(a.currentTime);
          setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        }}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); }}
      />

      {/* Botón play/pause */}
      <button
        onClick={togglePlay}
        className={`
          w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
          transition-colors
          ${isOwn ? 'bg-white/25 hover:bg-white/35' : 'bg-white/15 hover:bg-white/25'}
        `}
      >
        {playing ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <polygon points="6 3 20 12 6 21 6 3"/>
          </svg>
        )}
      </button>

      {/* Onda + progreso */}
      <div className="flex-1 flex flex-col gap-1.5">
        {/* Barras de onda */}
        <div
          className="relative flex items-end gap-[2px] h-8 cursor-pointer"
          onClick={handleSeek}
        >
          {bars.map((h, i) => {
            const pct     = (i / bars.length) * 100;
            const isPlayed = pct <= progress;
            return (
              <div
                key={i}
                style={{ height: `${h * 3}px` }}
                className={`
                  flex-1 rounded-full transition-colors
                  ${isPlayed
                    ? isOwn ? 'bg-white/80' : 'bg-accent'
                    : isOwn ? 'bg-white/30' : 'bg-white/25'
                  }
                `}
              />
            );
          })}
        </div>

        {/* Tiempo */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-white/60 font-mono">
            {playing || current > 0 ? fmt(current) : fmt(duration)}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-white/30">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

// ── Componente de contenido multimedia ───────────────────────────
const MediaContent = ({ message, isOwn }) => {
  const { mediaType, mediaUrl, mediaName, mediaSize } = message;
  if (!mediaUrl) return null;

  if (mediaType === 'image') {
    return (
      <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={mediaUrl}
          alt={mediaName || 'imagen'}
          className="rounded-xl max-w-[260px] max-h-[260px] w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </a>
    );
  }

  if (mediaType === 'video') {
    return (
      <video
        src={mediaUrl}
        controls
        className="rounded-xl max-w-[260px] max-h-[200px] w-full"
      />
    );
  }

  if (mediaType === 'audio') {
    return <AudioPlayer src={mediaUrl} isOwn={isOwn} />;
  }

  // Documento / archivo genérico
  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        flex items-center gap-3 p-3 rounded-xl
        ${isOwn ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 hover:bg-white/10'}
        transition-colors max-w-[240px]
      `}
    >
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{mediaName || 'Archivo'}</p>
        <p className="text-[10px] opacity-60 mt-0.5">{formatSize(mediaSize)}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-60">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </a>
  );
};

// ── Contenido de una encuesta dentro de la burbuja ─────────────────
const PollContent = ({ poll, isOwn, currentUserId, onVote }) => {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);

  return (
    <div className="px-4 py-3 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-70">
          <path d="M21 21H3" /><path d="M7 21V10" /><path d="M13 21V4" /><path d="M19 21v-7" />
        </svg>
        <p className="text-sm font-semibold">{poll.question}</p>
      </div>

      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const votesCount = opt.votes.length;
          const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          const votedByMe = opt.votes.some(
            (v) => (v?._id || v)?.toString() === currentUserId
          );

          return (
            <button
              key={opt._id}
              onClick={() => onVote(opt._id)}
              className={`
                w-full text-left rounded-xl px-3 py-2 relative overflow-hidden
                border transition-colors
                ${votedByMe
                  ? 'border-accent bg-accent/15'
                  : `border-white/10 ${isOwn ? 'hover:bg-white/10' : 'hover:bg-hover'}`}
              `}
            >
              {/* Barra de progreso de fondo */}
              {totalVotes > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-accent/10"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-sm flex items-center gap-1.5 min-w-0">
                  {votedByMe && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  <span className="truncate">{opt.text}</span>
                </span>
                {totalVotes > 0 && (
                  <span className="text-[11px] text-text-muted flex-shrink-0">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-text-muted mt-2">
        {totalVotes === 0
          ? 'Nadie ha votado todavía'
          : `${totalVotes} voto${totalVotes === 1 ? '' : 's'}`}
        {poll.allowMultiple && ' · Varias respuestas permitidas'}
      </p>
    </div>
  );
};

const MessageBubble = ({ message, isOwn, conversationId, showAvatar, onDelete, onStarChange, isSelected = false, onToggleSelect = () => {}, selectionMode = false }) => {
  const { socket }              = useSocket();
  const { user }                 = useAuth();
  const { showToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [starring, setStarring] = useState(false);
  const menuRef = useRef(null);

  // ── Destacados ─────────────────────────────────────
  // starredBy viene como array de ids (string u ObjectId) del backend.
  const isStarred = (message.starredBy || []).some(
    (u) => (u?._id || u)?.toString() === user._id
  );

  const handleToggleStar = async () => {
    setShowMenu(false);
    setStarring(true);
    try {
      const { data } = await api.post(
        `/conversations/${conversationId}/messages/${message._id}/star`
      );
      onStarChange?.(message._id, data.starred, user._id);
    } catch (err) {
      console.error('Error destacando mensaje:', err);
      showToast('No se pudo destacar el mensaje', 'error');
    } finally {
      setStarring(false);
    }
  };

  const handleVote = (optionId) => {
    socket?.emit('poll:vote', {
      messageId: message._id,
      optionId,
      conversationId,
    });
  };

  // Funciones para selección de mensajes
  const handleMessageClick = (e) => {
    if (!isOwn) return;
    if (selectionMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect(message._id);
    }
  };

  const handleContextMenu = (e) => {
    if (!isOwn) return;
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect(message._id);
  };

  // ── Reaccionar con emoji ──────────────────────────
  const handleReact = (emoji) => {
    socket?.emit('message:react', {
      messageId: message._id,
      emoji,
      conversationId,
    });
    setShowMenu(false);
  };

  // ── Eliminar mensaje ──────────────────────────────
  // Ya no usa window.confirm (se ve como popup del navegador).
  // handleDelete solo abre el modal propio; performDelete hace el borrado real.
  const handleDelete = () => {
    setShowMenu(false);
    setShowConfirmDelete(true);
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      const { data } = await api.delete(`/conversations/${conversationId}/messages`, {
        data: { messageIds: [message._id] },
      });
      socket?.emit('message:delete', {
        messageIds:     data.deletedIds,
        conversationId: data.conversationId,
      });
      onDelete?.(message._id);
      setShowConfirmDelete(false);
    } catch (err) {
      console.error('Error eliminando:', err);
      showToast('No se pudo eliminar el mensaje', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Agrupar reacciones por emoji ──────────────────
  const grouped = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const time = new Date(message.createdAt)
    .toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`
        flex gap-2 group relative
        ${isOwn ? 'flex-row-reverse' : 'flex-row'}
        ${showAvatar ? 'mt-3' : 'mt-0.5'}
        ${isSelected ? 'bg-accent/10 rounded-2xl px-2 py-1' : ''}
        ${isOwn && !selectionMode ? 'cursor-pointer transition-colors hover:bg-white/2' : ''}
        ${selectionMode && isOwn ? 'cursor-pointer' : ''}
      `}
      onClick={handleMessageClick}
      onContextMenu={handleContextMenu}
    >
      {/* Checkbox en modo selección */}
      {selectionMode && isOwn && (
        <div className="flex items-start pt-2 flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(message._id)}
            className="w-5 h-5 accent-accent cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Avatar — solo primer mensaje del bloque */}
      <div className="w-9 flex-shrink-0 flex items-end">
        {showAvatar && !isOwn && (
          <Avatar user={message.sender} size={34} />
        )}
      </div>

      {/* Columna principal */}
      <div className={`
        max-w-[75%] flex flex-col
        ${isOwn ? 'items-end' : 'items-start'}
      `}>

        {/* Nombre + hora primer mensaje del bloque */}
        {showAvatar && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span
              className="text-xs font-semibold"
              style={{ color: message.sender?.avatarColor || '#a8a0ff' }}
            >
              {message.sender?.username}
            </span>
            <span className="text-[10px] text-text-muted">{time}</span>
          </div>
        )}

        {/* Fila: botones + burbuja */}
        <div className={`
          flex items-center gap-1.5
          ${isOwn ? 'flex-row-reverse' : 'flex-row'}
        `}>

          {/* ══════════════════════════════════════
           * BOTONES DE ACCIÓN
           *
           * RESPONSIVE:
           * - Móvil: opacity-100 = siempre visibles
           * - PC: opacity-0 por defecto,
           *       aparecen al hover con group-hover
           * ══════════════════════════════════════ */}
          <div className={`
            flex items-center gap-1
            opacity-100 md:opacity-0 md:group-hover:opacity-100
            transition-opacity duration-150
          `}>

            {/* Botón reaccionar 😊 */}
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="
                  w-8 h-8 rounded-xl
                  flex items-center justify-center
                  text-text-muted hover:text-text-primary
                  hover:bg-hover active:bg-active
                  transition-colors text-base
                "
                title="Reaccionar"
              >
                😊
              </button>

              {/* Panel de acciones */}
              {showMenu && (
                <>
                  {/* Overlay para cerrar al tocar fuera */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />

                  {/*
                   * FIX CRÍTICO — Menú se abre hacia ABAJO
                   *
                   * ANTES (bug): bottom-full mb-2
                   *   → el menú se abría hacia arriba
                   *   → en el primer mensaje se salía
                   *     de la pantalla y no se veía
                   *
                   * AHORA (fix): top-full mt-2
                   *   → el menú se abre hacia abajo
                   *   → siempre visible sin importar
                   *     la posición del mensaje
                   */}
                  <div className={`
                    absolute top-full mt-2 z-50
                    bg-panel border border-white/15
                    rounded-2xl shadow-2xl overflow-hidden
                    min-w-[200px]
                    ${isOwn ? 'right-0' : 'left-0'}
                  `}>

                    {/* Fila de emojis */}
                    <div className="px-3 py-2.5 border-b border-white/5">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                        Reaccionar
                      </p>
                      <div className="flex gap-1">
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(emoji)}
                            className="
                              w-9 h-9 rounded-xl
                              flex items-center justify-center
                              text-lg
                              hover:bg-hover active:bg-active
                              hover:scale-125 active:scale-110
                              transition-all
                            "
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opción destacar — cualquier mensaje, propio o ajeno */}
                    <button
                      onClick={handleToggleStar}
                      disabled={starring}
                      className="
                        w-full flex items-center gap-3
                        px-4 py-3
                        text-text-primary text-sm font-medium
                        hover:bg-hover active:bg-active
                        transition-colors
                        disabled:opacity-50
                      "
                    >
                      {starring ? (
                        <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      ) : (
                        <svg
                          width="16" height="16"
                          viewBox="0 0 24 24"
                          fill={isStarred ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={isStarred ? 'text-yellow-400' : ''}
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      )}
                      {isStarred ? 'Quitar de destacados' : 'Destacar mensaje'}
                    </button>

                    {/* Opción eliminar — solo mensajes propios */}
                    {isOwn && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="
                          w-full flex items-center gap-3
                          px-4 py-3
                          text-accent-red text-sm font-medium
                          hover:bg-accent-red/10 active:bg-accent-red/20
                          transition-colors
                          disabled:opacity-50
                        "
                      >
                        {deleting ? (
                          <div className="w-4 h-4 border-2 border-accent-red/30 border-t-accent-red rounded-full animate-spin" />
                        ) : (
                          <svg
                            width="16" height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        )}
                        Eliminar mensaje
                      </button>
                    )}

                    {/* Cancelar */}
                    <button
                      onClick={() => setShowMenu(false)}
                      className="
                        w-full flex items-center gap-3
                        px-4 py-3
                        text-text-secondary text-sm
                        hover:bg-hover active:bg-active
                        transition-colors
                        border-t border-white/5
                      "
                    >
                      <svg
                        width="16" height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Cancelar
                    </button>

                  </div>
                </>
              )}
            </div>
            {/* Fin botón reaccionar */}

            {/* Botón papelera directo — solo mensajes propios */}
            {isOwn && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Eliminar"
                className="
                  w-8 h-8 rounded-xl
                  flex items-center justify-center
                  text-text-muted
                  hover:text-accent-red hover:bg-accent-red/10
                  active:bg-accent-red/20
                  transition-colors
                  disabled:opacity-30
                "
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                ) : (
                  <svg
                    width="15" height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                )}
              </button>
            )}

          </div>
          {/* Fin botones de acción */}

          {/* ══ BURBUJA DEL MENSAJE ══ */}
          <div className={`
            rounded-2xl text-sm leading-relaxed
            ${message.mediaType === 'audio'
              ? ''
              : `overflow-hidden ${isOwn
                  ? 'bg-accent text-white rounded-br-md'
                  : 'bg-input text-text-primary rounded-bl-md'
                }`
            }
          `}>
            {/* Respuesta a un estado */}
            <StatusReplyPreview statusReply={message.statusReply} isOwn={isOwn} />

            {/* Encuesta */}
            {message.poll && (
              <PollContent
                poll={message.poll}
                isOwn={isOwn}
                currentUserId={user._id}
                onVote={handleVote}
              />
            )}

            {/* Contenido multimedia */}
            {message.mediaUrl && (
              <div className={message.text ? 'p-2 pb-0' : message.mediaType === 'audio' ? '' : 'p-2'}>
                <MediaContent message={message} isOwn={isOwn} />
              </div>
            )}

            {/* Texto del mensaje */}
            {message.text && (
              <div className="px-4 py-2.5">
                {message.text}
              </div>
            )}

            {/* Hora + estado — solo mensajes propios */}
            {isOwn && (
              <div className="flex items-center gap-1 pb-1.5 pr-3 justify-end">
                {isStarred && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                )}
                <span className="text-[10px] text-white/50">{time}</span>
                <MessageStatus status={message.status ?? 'sent'} />
              </div>
            )}

            {/* Hora — mensajes de otros (sin check) */}
            {!isOwn && !message.mediaUrl && (
              <div className="px-4 pb-1.5 -mt-1.5 flex items-center gap-1">
                {isStarred && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                )}
                <span className="text-[10px] text-text-muted">{time}</span>
              </div>
            )}
          </div>
          {/* Fin burbuja */}

        </div>
        {/* Fin fila burbuja + botones */}

        {/* ══ REACCIONES EXISTENTES ══ */}
        {grouped && Object.keys(grouped).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 px-1">
            {Object.entries(grouped).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="
                  flex items-center gap-1
                  bg-white/5 border border-white/10
                  rounded-full px-2.5 py-1
                  text-xs
                  hover:bg-white/10 active:bg-white/15
                  transition-colors
                "
              >
                <span>{emoji}</span>
                <span className="text-text-secondary font-medium">{count}</span>
              </button>
            ))}
          </div>
        )}

      </div>
      {/* Fin columna principal */}

      {/* Modal propio de confirmación (reemplaza window.confirm) */}
      {showConfirmDelete && (
        <DeleteMessagesModal
          count={1}
          isDeleting={deleting}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={performDelete}
        />
      )}

    </div>
  );
};

export default MessageBubble;