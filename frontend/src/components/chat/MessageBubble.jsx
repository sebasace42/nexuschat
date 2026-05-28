import { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import Avatar from '../ui/Avatar';

const QUICK_EMOJIS = ['👍','❤️','😂','🔥','😮','👏'];

const MessageBubble = ({ message, isOwn, conversationId, showAvatar, onDelete }) => {
  const { socket }             = useSocket();
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
  const handleDelete = async () => {
    setShowMenu(false);
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    setDeleting(true);
    try {
      const { data } = await api.delete(`/messages/${message._id}`);
      socket?.emit('message:delete', {
        messageId:      data.messageId,
        conversationId: data.conversationId,
      });
      onDelete?.(message._id);
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('No se pudo eliminar el mensaje');
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
    /*
     * "group" permite que los hijos usen group-hover
     * para aparecer solo cuando el mouse está sobre
     * este div en PC.
     */
    <div
      className={`
        flex gap-2 group relative
        ${isOwn ? 'flex-row-reverse' : 'flex-row'}
        ${showAvatar ? 'mt-3' : 'mt-0.5'}
      `}
    >
      {/* Avatar — solo primer mensaje del bloque */}
      <div className="w-9 flex-shrink-0 flex items-end">
        {showAvatar && !isOwn && (
          <Avatar user={message.sender} size={34} />
        )}
      </div>

      {/* Columna principal del mensaje */}
      <div className={`
        max-w-[75%] flex flex-col
        ${isOwn ? 'items-end' : 'items-start'}
      `}>

        {/* Nombre + hora (primer mensaje del bloque) */}
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

        {/* Fila: acciones izquierda + burbuja + acciones derecha */}
        <div className={`
          flex items-center gap-1.5
          ${isOwn ? 'flex-row-reverse' : 'flex-row'}
        `}>

          {/* ══════════════════════════════════════════
           * BOTONES DE ACCIÓN
           *
           * LÓGICA RESPONSIVE:
           *
           * En PC (md:):
           *   - opacity-0 por defecto (invisibles)
           *   - group-hover:opacity-100 → aparecen al hover
           *
           * En MÓVIL (sin md:):
           *   - opacity-100 SIEMPRE visibles
           *   - El usuario puede tocarlos directamente
           *
           * Clase completa:
           *   "opacity-100 md:opacity-0 md:group-hover:opacity-100"
           *   Significa:
           *   - Sin prefijo (móvil): opacity-100 = siempre visible
           *   - md:opacity-0 = en PC empieza invisible
           *   - md:group-hover:opacity-100 = en PC aparece al hover
           * ══════════════════════════════════════════ */}
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

              {/* Panel de emojis rápidos */}
              {showMenu && (
                <>
                  {/* Overlay para cerrar al tocar fuera */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />

                  {/* Panel de acciones */}
                  <div className={`
                    absolute bottom-full mb-2 z-50
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
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Botón papelera — solo mensajes propios, VISIBLE EN MÓVIL */}
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
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          {/* FIN BOTONES DE ACCIÓN */}

          {/* ══ BURBUJA DEL MENSAJE ══ */}
          <div className={`
            px-4 py-2.5 rounded-2xl text-sm leading-relaxed
            ${isOwn
              ? 'bg-accent text-white rounded-br-md'
              : 'bg-input text-text-primary rounded-bl-md'
            }
          `}>
            {message.text}

            {/* Hora + ticks en mensajes propios */}
            {isOwn && (
              <div className="flex items-center gap-1 mt-0.5 justify-end">
                <span className="text-[10px] text-white/50">{time}</span>
                <span className={`text-xs ${
                  message.readBy?.length > 1
                    ? 'text-accent-teal'
                    : 'text-white/40'
                }`}>
                  ✓✓
                </span>
              </div>
            )}
          </div>
          {/* FIN BURBUJA */}

        </div>
        {/* FIN FILA BURBUJA + ACCIONES */}

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
      {/* FIN COLUMNA PRINCIPAL */}

    </div>
  );
};

export default MessageBubble;