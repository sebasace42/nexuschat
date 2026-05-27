import { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import Avatar from '../ui/Avatar';

const QUICK = ['👍','❤️','😂','🔥','😮','👏'];

const MessageBubble = ({ message, isOwn, conversationId, showAvatar, onDelete }) => {
  const { socket }               = useSocket();
  const [showReact,  setShowReact]  = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const react = (emoji) => {
    socket?.emit('message:react', { messageId: message._id, emoji, conversationId });
    setShowReact(false);
  };

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

  const time = new Date(message.createdAt)
    .toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  const grouped = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className={`flex gap-2 group relative ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
      onMouseLeave={() => { setShowReact(false); setShowMenu(false); }}
    >
      {/* Avatar */}
      <div className="w-9 flex-shrink-0 flex items-end">
        {showAvatar && !isOwn && <Avatar user={message.sender} size={34} />}
      </div>

      {/* Contenido */}
      <div className={`max-w-[78%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>

        {/* Nombre + hora (primer bloque) */}
        {showAvatar && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className="text-xs font-semibold" style={{ color: message.sender?.avatarColor || '#a8a0ff' }}>
              {message.sender?.username}
            </span>
            <span className="text-[10px] text-text-muted">{time}</span>
          </div>
        )}

        {/* Fila: burbuja + acciones */}
        <div className={`flex items-end gap-2 w-full ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>

          {/* Burbuja */}
          <div className="relative">
            {/*
             * TOQUE LARGO en móvil → abre menú de acciones
             * En PC el menú aparece con hover sobre los botones
             */}
            <div
              className={`
                px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-pointer
                select-none
                ${isOwn
                  ? 'bg-accent text-white rounded-br-md'
                  : 'bg-input text-text-primary rounded-bl-md'
                }
              `}
              onContextMenu={(e) => {
                // Clic derecho en PC o toque largo simulado
                e.preventDefault();
                if (isOwn) setShowMenu((v) => !v);
              }}
              onTouchStart={(e) => {
                // Toque largo en móvil (500ms)
                if (!isOwn) return;
                const timer = setTimeout(() => setShowMenu((v) => !v), 500);
                e.currentTarget._timer = timer;
              }}
              onTouchEnd={(e) => {
                clearTimeout(e.currentTarget._timer);
              }}
              onTouchMove={(e) => {
                clearTimeout(e.currentTarget._timer);
              }}
            >
              {message.text}

              {/* Hora + ticks en mensajes propios */}
              {isOwn && (
                <div className="flex items-center gap-1 mt-0.5 justify-end">
                  <span className="text-[10px] text-white/50">{time}</span>
                  <span className={`text-xs ${message.readBy?.length > 1 ? 'text-accent-teal' : 'text-white/40'}`}>
                    ✓✓
                  </span>
                </div>
              )}
            </div>

            {/*
             * MENÚ CONTEXTUAL — aparece al toque largo en móvil
             * o al clic derecho en PC
             * Solo visible si isOwn y showMenu === true
             */}
            {isOwn && showMenu && (
              <div className={`
                absolute bottom-full mb-2 z-50
                bg-panel border border-white/15
                rounded-2xl shadow-2xl overflow-hidden
                min-w-[160px]
                ${isOwn ? 'right-0' : 'left-0'}
              `}>
                {/* Opción: Reaccionar */}
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
                    Reaccionar
                  </p>
                  <div className="flex gap-1">
                    {QUICK.map((e) => (
                      <button
                        key={e}
                        onClick={() => { react(e); setShowMenu(false); }}
                        className="w-8 h-8 flex items-center justify-center text-base hover:scale-125 active:scale-110 transition-transform rounded-lg hover:bg-hover"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opción: Eliminar */}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-4 py-3 text-accent-red hover:bg-accent-red/10 active:bg-accent-red/20 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-accent-red/30 border-t-accent-red rounded-full animate-spin" />
                  ) : (
                    /* Ícono papelera SVG nativo */
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

                {/* Opción: Cancelar */}
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-hover active:bg-active transition-colors text-sm border-t border-white/5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/*
           * BOTÓN PAPELERA — visible en PC al hover
           * En móvil se usa el menú contextual (toque largo)
           * por eso en móvil está oculto (hidden md:flex)
           */}
          {isOwn && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Eliminar mensaje"
              className="
                hidden md:flex
                w-7 h-7 rounded-lg flex-shrink-0
                items-center justify-center
                text-text-muted
                hover:text-accent-red hover:bg-accent-red/10
                transition-all duration-150
                opacity-0 group-hover:opacity-100
                disabled:opacity-30 disabled:cursor-not-allowed
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

        {/* Reacciones */}
        {grouped && Object.keys(grouped).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(grouped).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => react(emoji)}
                className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-xs hover:bg-white/10 active:bg-white/15 transition-colors"
              >
                {emoji}
                <span className="text-text-secondary">{count}</span>
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Overlay para cerrar menú al tocar afuera */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}

    </div>
  );
};

export default MessageBubble;