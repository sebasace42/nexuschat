import Avatar from '../ui/Avatar';

/*
 * Ubicación: src/components/modals/StarredMessagesModal.jsx
 * (junto a DeleteMessagesModal.jsx, mismo patrón)
 */

/*
 * StarredMessagesModal — Lista de mensajes destacados (estilo WhatsApp).
 *
 * Sirve para dos casos:
 *  1) Destacados de UN chat (ChatArea le pasa los mensajes ya filtrados
 *     de esa conversación, showChatName=false).
 *  2) Destacados GLOBALES de todos tus chats (StarredMessagesPage le
 *     pasa los mensajes de /conversations/starred/messages,
 *     showChatName=true para saber de qué chat viene cada uno).
 *
 * Props:
 *   messages      — array de mensajes (con sender poblado; con
 *                    conversation poblado si showChatName=true)
 *   currentUserId — id del usuario actual (para pintar "Tú:")
 *   onClose       — cerrar el modal
 *   onUnstar(messageId, conversationId) — quitar de destacados
 *   showChatName  — si true, muestra el nombre del chat de cada mensaje
 *   title         — título del modal
 */
const StarredMessagesModal = ({
  messages = [],
  currentUserId,
  onClose,
  onUnstar,
  showChatName = false,
  title = 'Mensajes destacados',
}) => {
  const getOtherParticipant = (conversation) => {
    if (!conversation?.participants) return null;
    return conversation.participants.find((p) => p._id !== currentUserId);
  };

  const formatTime = (date) =>
    new Date(date).toLocaleString('es', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-panel border border-white/10 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <h2 className="text-base font-semibold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-hover transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted mb-3">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <p className="text-sm text-text-muted">
                {showChatName
                  ? 'Todavía no has destacado ningún mensaje.'
                  : 'Todavía no has destacado ningún mensaje en este chat.'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Mantén presionado un mensaje y elige "Destacar mensaje".
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const chatUser = showChatName ? getOtherParticipant(m.conversation) : null;
              const isOwn = m.sender?._id === currentUserId;

              return (
                <div
                  key={m._id}
                  className="flex gap-3 px-5 py-3 border-b border-white/5 last:border-b-0"
                >
                  <Avatar user={m.sender} size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: m.sender?.avatarColor || '#a8a0ff' }}
                      >
                        {isOwn ? 'Tú' : m.sender?.username}
                      </span>
                      <span className="text-[10px] text-text-muted flex-shrink-0">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>

                    {showChatName && chatUser && (
                      <p className="text-[10px] text-accent mb-0.5">
                        en tu chat con {chatUser.username}
                      </p>
                    )}

                    <p className="text-sm text-text-primary break-words">
                      {m.text || (m.mediaType ? `📎 ${m.mediaType}` : '')}
                    </p>
                  </div>

                  <button
                    onClick={() => onUnstar?.(m._id, m.conversation?._id || m.conversation)}
                    className="flex-shrink-0 self-start text-yellow-400 hover:text-yellow-300 transition-colors"
                    title="Quitar de destacados"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StarredMessagesModal;