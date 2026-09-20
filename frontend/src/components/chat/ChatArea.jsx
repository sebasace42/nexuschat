import { useState, useEffect, useRef, useMemo } from 'react';
import api          from '../../api/axios';
import { useAuth }  from '../../context/AuthContext';
import { useSocket} from '../../context/SocketContext';
import MessageBubble from './MessageBubble';
import MessageInput  from './MessageInput';
import Avatar        from '../ui/Avatar';
import StatusDot     from '../ui/StatusDot';
import { requestNotificationPermission, showIncomingMessageNotification } from '../../utils/notifications';
import DeleteChatModal from '../modals/DeleteChatModal';
import BlockUserModal  from '../modals/BlockUserModal';
import DeleteMessagesModal from '../modals/DeleteMessagesModal';
import StarredMessagesModal from '../modals/StarredMessagesModal';
import { useToast } from '../ui/ToastContext';

const ChatArea = ({ conversation, onBack }) => {
  const { showToast }           = useToast();
  const { user }                = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [messages,    setMessages]    = useState([]);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const bottomRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOptions,     setShowOptions]     = useState(false);
  const [showStarredModal, setShowStarredModal] = useState(false);
  const [deletingChat,    setDeletingChat]    = useState(false);
  const [showBlockModal,  setShowBlockModal]  = useState(false);
  const [isBlocked,       setIsBlocked]       = useState(false);
  const [blocking,        setBlocking]        = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [showDeleteMessagesModal, setShowDeleteMessagesModal] = useState(false);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  const other         = conversation?.participants?.find((p) => p._id !== user._id);
  const isOtherOnline = onlineUsers.includes(other?._id);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredMessages = useMemo(() => {
    // Si tenemos bloqueado al otro usuario, ocultamos sus mensajes
    // (los tuyos propios en ese chat se siguen viendo).
    const base = isBlocked
      ? messages.filter((msg) => msg.sender._id !== other?._id)
      : messages;

    if (!normalizedSearch) return base;
    return base.filter((msg) =>
      msg.text?.toLowerCase().includes(normalizedSearch)
    );
  }, [messages, normalizedSearch, isBlocked, other?._id]);

  // Cargar mensajes al cambiar de conversación
  useEffect(() => {
    if (!conversation) return;
    setMessages([]);
    setTypingUsers([]);
    setPage(1);
    setHasMore(false);
    setLoading(true);

    api.get(`/conversations/${conversation._id}/messages?page=1&limit=30`)
      .then(({ data }) => {
        const nextMessages = Array.isArray(data) ? data : data.messages || [];
        setMessages(nextMessages);
        setHasMore(!Array.isArray(data) ? data.hasMore : false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [conversation?._id]);

  // Consultar si tenemos bloqueado al otro usuario de esta conversación
  useEffect(() => {
    if (!other?._id) { setIsBlocked(false); return; }
    api.get(`/users/${other._id}/block-status`)
      .then(({ data }) => setIsBlocked(!!data.blocked))
      .catch(() => setIsBlocked(false));
  }, [other?._id]);

  // Marcar mensajes como leídos al abrir el chat (→ doble check azul)
  useEffect(() => {
    if (!conversation?._id || !socket) return;
    socket.emit('message:read', { conversationId: conversation._id });
  }, [conversation?._id, socket]);

  // Solicitar permiso de notificaciones al entrar al chat
  useEffect(() => {
    requestNotificationPermission().catch(() => undefined);
  }, []);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (page === 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, page]);

  /*
   * ─── CAMBIO CLAVE ──────────────────────────────────────────────────────────
   * handleDeleteChat ya NO emite conversation:delete por socket
   * (ese evento llegaba a TODOS los participantes y borraba el chat del otro).
   *
   * El backend ahora emite conversation:hidden directamente al socket
   * del usuario que eliminó, usando su socketId privado.
   * ChatArea solo necesita cerrar el modal y volver al sidebar.
   * ─────────────────────────────────────────────────────────────────────────
   */
  const handleDeleteChat = async (deleteMedia) => {
    setDeletingChat(true);
    try {
      await api.delete(`/conversations/${conversation._id}`, {
        data: { deleteMedia },
      });

      // El backend ya se encarga de emitir conversation:hidden al socket
      // de este usuario. Aquí solo navegamos de vuelta al sidebar.
      onBack();

    } catch (err) {
      console.error('Error eliminando chat:', err);
      showToast('No se pudo eliminar el chat', 'error');
    } finally {
      setDeletingChat(false);
      setShowDeleteModal(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // FUNCIONES PARA ELIMINACIÓN MÚLTIPLE DE MENSAJES
  // ──────────────────────────────────────────────────────────────────
  const toggleMessageSelection = (messageId) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleDeleteMultipleClick = () => {
    if (selectedMessages.size > 0) {
      setShowDeleteMessagesModal(true);
    }
  };

  const confirmDeleteMultiple = async () => {
    if (selectedMessages.size === 0) return;

    setDeletingMultiple(true);
    try {
      const messageIds = Array.from(selectedMessages);
      await api.delete(`/conversations/${conversation._id}/messages`, {
        data: {
          messageIds,
        },
      });

      setMessages((prev) =>
        prev.filter((m) => !selectedMessages.has(m._id))
      );

      setSelectedMessages(new Set());
      setShowDeleteMessagesModal(false);

    } catch (err) {
      console.error('Error eliminando múltiples mensajes:', err);
      showToast('No se pudo eliminar los mensajes', 'error');
    } finally {
      setDeletingMultiple(false);
    }
  };

  // Todos los eventos del socket en un solo useEffect
  useEffect(() => {
    if (!socket) return;

    // Nuevo mensaje en tiempo real
    const onMsg = ({ message, conversationId }) => {
      if (conversationId !== conversation?._id) return;

      setMessages((prev) => [...prev, message]);

      if (message?.sender?._id && message.sender._id !== user?._id) {
        showIncomingMessageNotification({
          senderName: message.sender.username || 'NexusChat',
          text: message.text,
          conversationId,
        });
      }
    };

    // Actualización de estado → doble check azul en tiempo real
    const onStatus = ({ conversationId: cId, status, messageIds }) => {
      if (cId !== conversation?._id) return;
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m._id) ? { ...m, status } : m
        )
      );
    };

    // Reacción actualizada
    const onReact = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === messageId ? { ...m, reactions } : m)
      );
    };

    // Indicador de escritura — empezar
    const onTypingStart = ({ userId, conversationId: cId }) => {
      if (cId !== conversation?._id) return;
      setTypingUsers((p) => p.includes(userId) ? p : [...p, userId]);
    };

    // Indicador de escritura — parar
    const onTypingStop = ({ userId, conversationId: cId }) => {
      if (cId !== conversation?._id) return;
      setTypingUsers((p) => p.filter((id) => id !== userId));
    };

    // Mensaje eliminado en tiempo real
    const onDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    // Encuesta actualizada (alguien votó o quitó su voto)
    const onPollUpdated = ({ messageId, poll }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === messageId ? { ...m, poll } : m)
      );
    };

    socket.on('message:new',      onMsg);
    socket.on('message:status',   onStatus);
    socket.on('message:reaction', onReact);
    socket.on('typing:start',     onTypingStart);
    socket.on('typing:stop',      onTypingStop);
    socket.on('message:deleted',  onDeleted);
    socket.on('poll:updated',     onPollUpdated);

    return () => {
      socket.off('message:new',      onMsg);
      socket.off('message:status',   onStatus);
      socket.off('message:reaction', onReact);
      socket.off('typing:start',     onTypingStart);
      socket.off('typing:stop',      onTypingStop);
      socket.off('message:deleted',  onDeleted);
      socket.off('poll:updated',     onPollUpdated);
    };
  }, [socket, conversation?._id]);

  // Agrupar mensajes del mismo usuario
  const showAvatar = (msgs, i) => {
    if (i === 0) return true;
    if (msgs[i - 1].sender._id !== msgs[i].sender._id) return true;
    return (new Date(msgs[i].createdAt) - new Date(msgs[i - 1].createdAt)) / 60000 > 5;
  };

  const loadMoreMessages = async () => {
    if (!conversation || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data } = await api.get(`/conversations/${conversation._id}/messages?page=${nextPage}&limit=30`);
      const nextMessages = Array.isArray(data) ? data : data.messages || [];
      setMessages((prev) => [...nextMessages, ...prev]);
      setPage(nextPage);
      setHasMore(!Array.isArray(data) ? data.hasMore : false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Bloquear al usuario de esta conversación
  const handleBlockUser = async () => {
    if (!other?._id) return;
    setBlocking(true);
    try {
      await api.post(`/users/${other._id}/block`);
      setIsBlocked(true);
    } catch (err) {
      console.error('Error bloqueando usuario:', err);
      showToast('No se pudo bloquear al usuario', 'error');
    } finally {
      setBlocking(false);
      setShowBlockModal(false);
    }
  };

  // Desbloquear al usuario de esta conversación
  const handleUnblockUser = async () => {
    if (!other?._id) return;
    try {
      await api.post(`/users/${other._id}/unblock`);
      setIsBlocked(false);
    } catch (err) {
      console.error('Error desbloqueando usuario:', err);
      showToast('No se pudo desbloquear al usuario', 'error');
    }
  };

  // Eliminar mensaje del estado local inmediatamente
  const handleDeleteMessage = (messageId) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  };

  // Actualizar starredBy localmente al destacar/quitar un mensaje
  const handleStarChange = (messageId, starred, userId) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== messageId) return m;
        const current = m.starredBy || [];
        const next = starred
          ? [...current, userId]
          : current.filter((u) => (u?._id || u)?.toString() !== userId);
        return { ...m, starredBy: next };
      })
    );
  };

  const starredInThisChat = messages.filter((m) =>
    (m.starredBy || []).some((u) => (u?._id || u)?.toString() === user._id)
  );

  // Quitar destacado desde el modal de destacados (mismo endpoint, toggle)
  const handleUnstar = async (messageId) => {
    try {
      const { data } = await api.post(
        `/conversations/${conversation._id}/messages/${messageId}/star`
      );
      handleStarChange(messageId, data.starred, user._id);
    } catch (err) {
      console.error('Error quitando destacado:', err);
      showToast('No se pudo quitar de destacados', 'error');
    }
  };

  // Pantalla vacía cuando no hay conversación seleccionada
  if (!conversation) {
    return (
      <div className="flex-1 hidden md:flex items-center justify-center bg-main">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            NexusChat
          </h2>
          <p className="text-text-muted text-sm">
            Selecciona una conversación para comenzar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-main overflow-hidden">

      {/* ══ HEADER ══ */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">

        {/* Botón volver (solo móvil) */}
        <button
          onClick={onBack}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-hover transition-colors flex-shrink-0"
          aria-label="Volver"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Avatar con punto de estado */}
        <div className="relative flex-shrink-0">
          <Avatar user={isBlocked ? { ...other, avatarUrl: null } : other} size={36} />
          {!isBlocked && <StatusDot isOnline={isOtherOnline} size={11} borderColor="#1f2029" />}
        </div>

        {/* Nombre y estado online */}
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-white text-sm truncate">
            {other?.username}
          </p>
          <p className="text-xs mt-0.5">
            {isBlocked
              ? <span className="text-accent-red">Bloqueado</span>
              : isOtherOnline
                ? <span className="text-accent-green">● En línea</span>
                : <span className="text-text-muted">Desconectado</span>
            }
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowStarredModal(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-hover transition-colors"
            title="Mensajes destacados"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowOptions((v) => !v)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-hover transition-colors"
              title="Opciones"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5"  r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
                <circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>

            {showOptions && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOptions(false)}
                />
                <div className="
                  absolute top-full right-0 mt-1 z-50
                  bg-panel border border-white/10
                  rounded-xl shadow-2xl overflow-hidden
                  min-w-[180px]
                ">
                  <button
                    onClick={() => {
                      setShowOptions(false);
                      if (isBlocked) handleUnblockUser();
                      else setShowBlockModal(true);
                    }}
                    className="
                      w-full flex items-center gap-3 px-4 py-3
                      text-text-primary text-sm hover:bg-hover
                      active:bg-white/10 transition-colors
                    "
                  >
                    {isBlocked ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M4.9 4.9l14.2 14.2"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="4.9" y1="19.1" x2="19.1" y2="4.9"/>
                      </svg>
                    )}
                    {isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                  </button>

                  <div className="h-px bg-white/5" />

                  <button
                    onClick={() => {
                      setShowOptions(false);
                      setShowDeleteModal(true);
                    }}
                    className="
                      w-full flex items-center gap-3 px-4 py-3
                      text-accent-red text-sm hover:bg-accent-red/10
                      active:bg-accent-red/20 transition-colors
                    "
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
                    </svg>
                    Eliminar chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══ BARRA DE SELECCIÓN ══ */}
      {selectedMessages.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-accent/10 border-b border-accent/20">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 bg-accent text-white px-3 py-1 rounded-full text-xs font-semibold">
              {selectedMessages.size}
            </span>
            <span className="text-sm text-text-secondary">
              {selectedMessages.size === 1 ? 'mensaje' : 'mensajes'} seleccionado{selectedMessages.size === 1 ? '' : 's'}
            </span>
          </div>

          <button
            onClick={handleDeleteMultipleClick}
            className="flex items-center gap-2 bg-accent-red hover:bg-accent-red/90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
            </svg>
            Eliminar
          </button>
        </div>
      )}

      {/* ══ ÁREA DE MENSAJES ══ */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {/* Buscador responsive */}
        <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-white/8 bg-main/95 p-2 shadow-lg backdrop-blur md:p-3">
          <label className="flex items-center gap-2 rounded-xl bg-input px-3 py-2.5 text-text-muted focus-within:ring-1 focus-within:ring-accent/60">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar mensajes"
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="rounded-full p-1 text-text-muted transition-colors hover:bg-hover hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </label>
          <p className="mt-1 text-[11px] text-text-muted">
            {normalizedSearch
              ? `${filteredMessages.length} resultado${filteredMessages.length === 1 ? '' : 's'} para "${searchTerm.trim()}"`
              : 'Busca mensajes dentro de esta conversación'}
          </p>
        </div>

        {/* Botón de paginación */}
        {hasMore && (
          <div className="sticky top-0 z-10 mb-3 flex justify-center">
            <button
              type="button"
              onClick={loadMoreMessages}
              disabled={loadingMore}
              className="rounded-full border border-white/10 bg-panel px-4 py-2 text-xs font-semibold text-text-primary shadow-lg transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? 'Cargando...' : 'Cargar mensajes anteriores'}
            </button>
          </div>
        )}

        {/* Spinner de carga */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {/* Estado vacío */}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar user={other} size={64} />
            <h3 className="font-display font-bold text-white text-lg mt-4">
              {other?.username}
            </h3>
            <p className="text-text-muted text-sm mt-1">
              ¡Envía el primer mensaje! 👋
            </p>
          </div>
        )}

        {/* Lista de mensajes */}
        {!loading && normalizedSearch && filteredMessages.length === 0 && (
          <div className="py-10 text-center text-sm text-text-muted">
            No se encontraron mensajes con ese texto.
          </div>
        )}

        {filteredMessages.map((msg, i) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender._id === user._id}
            conversationId={conversation._id}
            showAvatar={showAvatar(filteredMessages, i)}
            onDelete={handleDeleteMessage}
            onStarChange={handleStarChange}
            isSelected={selectedMessages.has(msg._id)}
            onToggleSelect={toggleMessageSelection}
            selectionMode={selectedMessages.size > 0}
          />
        ))}

        {/* Indicador de escritura */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <div className="flex gap-1">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-muted" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-muted" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-text-muted" />
            </div>
            <span className="text-xs text-text-muted">
              {other?.username} está escribiendo...
            </span>
          </div>
        )}

        {/* Ancla para scroll automático */}
        <div ref={bottomRef} />
      </div>

      {/* ══ INPUT DE MENSAJE ══ */}
      <div className="flex-shrink-0">
        {isBlocked && (
          <div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-2.5">
            <p className="text-xs text-accent-red">
              Bloqueaste a {other?.username}. No puedes enviarle mensajes.
            </p>
            <button
              onClick={handleUnblockUser}
              className="text-xs font-semibold text-accent-red hover:underline flex-shrink-0"
            >
              Desbloquear
            </button>
          </div>
        )}
        <MessageInput
          conversationId={conversation._id}
          disabled={isBlocked}
          disabledPlaceholder="No puedes enviarle mensajes a este contacto"
        />
      </div>

      {/* Modal eliminar chat */}
      {showDeleteModal && (
        <DeleteChatModal
          contactName={other?.username}
          isDeleting={deletingChat}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteChat}
        />
      )}

      {/* Modal bloquear usuario */}
      {showBlockModal && (
        <BlockUserModal
          contactName={other?.username}
          isBlocking={blocking}
          onClose={() => setShowBlockModal(false)}
          onConfirm={handleBlockUser}
        />
      )}

      {/* Modal eliminar múltiples mensajes */}
      {showDeleteMessagesModal && (
        <DeleteMessagesModal
          count={selectedMessages.size}
          isDeleting={deletingMultiple}
          onClose={() => setShowDeleteMessagesModal(false)}
          onConfirm={confirmDeleteMultiple}
        />
      )}

      {/* Modal destacados de este chat */}
      {showStarredModal && (
        <StarredMessagesModal
          messages={starredInThisChat}
          currentUserId={user._id}
          onClose={() => setShowStarredModal(false)}
          onUnstar={handleUnstar}
          showChatName={false}
          title="Destacados en este chat"
        />
      )}

    </div>
  );
};

export default ChatArea;