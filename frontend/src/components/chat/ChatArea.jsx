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

  // Cargar mensajes cuando cambia la conversación
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

  // Scroll automático al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Escuchar eventos del socket en tiempo real
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

  // Agrupar mensajes: no repetir avatar si el mismo usuario envió seguido
  const showAvatar = (msgs, i) => {
    if (i === 0) return true;
    if (msgs[i - 1].sender._id !== msgs[i].sender._id) return true;
    const diff = (new Date(msgs[i].createdAt) - new Date(msgs[i - 1].createdAt)) / 60000;
    return diff > 5;
  };

  // Pantalla de bienvenida cuando no hay conversación (solo visible en PC)
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
    <div className="flex flex-col h-full w-full bg-main overflow-hidden">

      {/* ══════════════════════════════════════════
          TOPBAR — Encabezado del chat
          h-[56px] fijo para que no se mueva.
      ══════════════════════════════════════════ */}
      <div className="h-[56px] flex-shrink-0 px-3 flex items-center gap-2 border-b border-white/5 bg-main">

        {/*
         * BOTÓN VOLVER ← (solo en móvil)
         *
         * md:hidden = en PC (≥768px) este botón NO existe
         * En móvil sí aparece y llama a onBack() que
         * ejecuta setSelectedConv(null) en ChatPage.jsx,
         * lo que hace que el Sidebar vuelva a aparecer.
         *
         * El SVG es HTML nativo, sin librerías externas.
         * viewBox="0 0 24 24" define el canvas del ícono.
         * polyline points="15 18 9 12 15 6" dibuja una
         * flecha apuntando a la izquierda: ←
         */}
        <button
          onClick={onBack}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-hover transition-colors flex-shrink-0"
          aria-label="Volver a conversaciones"
        >
          <svg
            width="20"
            height="20"
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

        {/* Avatar del contacto con punto de estado */}
        <div className="relative flex-shrink-0">
          <Avatar user={other} size={34} />
          <StatusDot isOnline={isOtherOnline} size={10} borderColor="#1f2029" />
        </div>

        {/* Nombre y estado online */}
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-white text-sm truncate leading-tight">
            {other?.username}
          </p>
          <p className="text-xs leading-tight mt-0.5">
            {isOtherOnline
              ? <span className="text-accent-green">● En línea</span>
              : <span className="text-text-muted">Desconectado</span>
            }
          </p>
        </div>

        {/* Botones de acción — ocultos en móvil muy pequeño */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          {[
            { icon: '📹', label: 'Video' },
            { icon: '📞', label: 'Llamada' },
            { icon: '🔍', label: 'Buscar' },
          ].map(({ icon, label }) => (
            <button
              key={label}
              title={label}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-hover transition-colors"
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ÁREA DE MENSAJES
          flex-1 ocupa todo el espacio restante.
          overflow-y-auto permite scroll vertical.
      ══════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {/* Spinner de carga */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {/* Estado vacío — primer mensaje */}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Avatar user={other} size={64} />
            <h3 className="font-display font-bold text-white text-lg mt-4">
              {other?.username}
            </h3>
            <p className="text-text-muted text-sm mt-1">
              Este es el inicio de tu conversación
            </p>
            <p className="text-text-muted text-sm">¡Envía el primer mensaje! 👋</p>
          </div>
        )}

        {/* Lista de mensajes */}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender._id === user._id}
            conversationId={conversation._id}
            showAvatar={showAvatar(messages, i)}
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

      {/* ══════════════════════════════════════════
          INPUT DE MENSAJE
          flex-shrink-0 para que no se encoja.
      ══════════════════════════════════════════ */}
      <MessageInput conversationId={conversation._id} />
    </div>
  );
};

export default ChatArea;