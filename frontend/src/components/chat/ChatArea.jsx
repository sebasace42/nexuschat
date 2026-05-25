import { useState, useEffect, useRef } from 'react';
import api          from '../../api/axios';
import { useAuth }  from '../../context/AuthContext';
import { useSocket} from '../../context/SocketContext';
import MessageBubble from './MessageBubble';
import MessageInput  from './MessageInput';
import Avatar        from '../ui/Avatar';
import StatusDot     from '../ui/StatusDot';

const ChatArea = ({ conversation, onBack }) => {
  const { user }                = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [messages,    setMessages]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const bottomRef = useRef(null);

  const other         = conversation?.participants?.find((p) => p._id !== user._id);
  const isOtherOnline = onlineUsers.includes(other?._id);

  useEffect(() => {
    if (!conversation) return;
    setMessages([]);
    setTypingUsers([]);
    setLoading(true);
    api.get(`/conversations/${conversation._id}/messages`)
      .then(({ data }) => setMessages(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [conversation?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = ({ message, conversationId }) => {
      if (conversationId !== conversation?._id) return;
      setMessages((prev) => [...prev, message]);
    };
    const onReact = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === messageId ? { ...m, reactions } : m)
      );
    };
    const onTypingStart = ({ userId, conversationId: cId }) => {
      if (cId !== conversation?._id) return;
      setTypingUsers((p) => p.includes(userId) ? p : [...p, userId]);
    };
    const onTypingStop = ({ userId, conversationId: cId }) => {
      if (cId !== conversation?._id) return;
      setTypingUsers((p) => p.filter((id) => id !== userId));
    };
    socket.on('message:new',      onMsg);
    socket.on('message:reaction', onReact);
    socket.on('typing:start',     onTypingStart);
    socket.on('typing:stop',      onTypingStop);
    return () => {
      socket.off('message:new',      onMsg);
      socket.off('message:reaction', onReact);
      socket.off('typing:start',     onTypingStart);
      socket.off('typing:stop',      onTypingStop);
    };
  }, [socket, conversation?._id]);

  const showAvatar = (msgs, i) => {
    if (i === 0) return true;
    if (msgs[i - 1].sender._id !== msgs[i].sender._id) return true;
    return (new Date(msgs[i].createdAt) - new Date(msgs[i - 1].createdAt)) / 60000 > 5;
  };

  if (!conversation) {
    return (
      <div className="flex-1 hidden md:flex items-center justify-center bg-main">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">NexusChat</h2>
          <p className="text-text-muted text-sm">Selecciona una conversación para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    /*
     * El truco clave: usamos h-full y flex-col para que
     * el topbar sea fijo arriba y los mensajes scrolleen
     * debajo. El topbar NUNCA se mueve.
     */
    <div
      className="flex flex-col w-full bg-main overflow-hidden"
      style={{ height: '100%' }}
    >

      {/* ══ TOPBAR FIJO — siempre visible arriba ══
       *
       * flex-shrink-0 es CRÍTICO: evita que este div
       * se encoja cuando el contenido de abajo crece.
       * Sin esto, el topbar desaparecería.
       */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 border-b border-white/5 bg-main"
        style={{ height: '56px', minHeight: '56px' }}
      >
        {/*
         * FLECHA ATRÁS — md:hidden = invisible en PC
         *
         * SVG nativo sin librerías:
         * polyline points="15 18 9 12 15 6"
         * dibuja una V rotada 90°: ← flecha izquierda
         */}
        <button
          onClick={onBack}
          className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-hover transition-colors flex-shrink-0 active:bg-active"
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
          <Avatar user={other} size={36} />
          <StatusDot isOnline={isOtherOnline} size={11} borderColor="#1f2029" />
        </div>

        {/* Nombre y estado */}
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-white text-sm truncate">
            {other?.username}
          </p>
          <p className="text-xs mt-0.5">
            {isOtherOnline
              ? <span className="text-accent-green">● En línea</span>
              : <span className="text-text-muted">Desconectado</span>
            }
          </p>
        </div>
      </div>

      {/* ══ MENSAJES — scrollea independientemente ══
       *
       * flex-1 + overflow-y-auto es el combo clave:
       * flex-1 ocupa TODO el espacio entre el topbar
       * y el input. overflow-y-auto permite scroll
       * solo en esta zona sin mover el topbar ni el input.
       */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar user={other} size={64} />
            <h3 className="font-display font-bold text-white text-lg mt-4">
              {other?.username}
            </h3>
            <p className="text-text-muted text-sm mt-1">¡Envía el primer mensaje! 👋</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender._id === user._id}
            conversationId={conversation._id}
            showAvatar={showAvatar(messages, i)}
          />
        ))}

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

        <div ref={bottomRef} />
      </div>

      {/* ══ INPUT — fijo abajo ══
       * flex-shrink-0 evita que se encoja.
       */}
      <div className="flex-shrink-0">
        <MessageInput conversationId={conversation._id} />
      </div>
    </div>
  );
};

export default ChatArea;