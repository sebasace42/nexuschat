import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth }   from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar    from '../ui/Avatar';
import StatusDot from '../ui/StatusDot';
import NewChatModal from '../modals/NewChatModal';

const Sidebar = ({ selectedConv, onSelectConversation, onOpenSettings }) => {
  const { user }                = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [showNewChat,   setShowNewChat]   = useState(false);
  const [activeTab,     setActiveTab]     = useState('all');

  useEffect(() => { if (user) fetchConversations(); }, [user]);

  useEffect(() => {
    if (!socket || conversations.length === 0) return;
    socket.emit('conversations:join', conversations.map((c) => c._id));
  }, [socket, conversations]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, lastMessage }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id !== conversationId) return c;
          const isActive = selectedConv?._id === conversationId;
          const cur = c.unreadCount?.[user._id] || 0;
          return {
            ...c,
            lastMessage,
            updatedAt: new Date().toISOString(),
            unreadCount: {
              ...c.unreadCount,
              [user._id]: isActive ? 0 : cur + 1,
            },
          };
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    };
    socket.on('conversation:updated', handler);
    return () => socket.off('conversation:updated', handler);
  }, [socket, selectedConv, user]);

  // Escuchar el evento en el Sidebar cuando se elimina un chat completo
  useEffect(() => {
    if (!socket) return;

    const onConvDeleted = ({ conversationId }) => {
      setConversations((prev) =>
        prev.filter((c) => c._id !== conversationId)
      );

      // Si la conversación eliminada es la que está abierta, deseleccionarla
      if (selectedConv?._id === conversationId) {
        onSelectConversation(null);
      }
    };

    socket.on('conversation:deleted', onConvDeleted);

    return () => {
      socket.off('conversation:deleted', onConvDeleted);
    };
  }, [socket, selectedConv, onSelectConversation]);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/conversations');
      setConversations(data);
    } catch (err) { console.error(err); }
  };

  const handleSelect = (conv) => {
    setConversations((prev) =>
      prev.map((c) => c._id === conv._id
        ? { ...c, unreadCount: { ...c.unreadCount, [user._id]: 0 } }
        : c)
    );
    onSelectConversation(conv);
  };

  const getOther = (conv) =>
    conv.participants.find((p) => p._id !== user._id) || conv.participants[0];

  const formatTime = (d) => {
    if (!d) return '';
    const date = new Date(d), now = new Date();
    const diff = (now - date) / 1000 / 60 / 60 / 24;
    if (diff < 1) return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    if (diff < 7) return date.toLocaleDateString('es', { weekday: 'short' });
    return date.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
  };

  const filtered = activeTab === 'unread'
    ? conversations.filter((c) => (c.unreadCount?.[user._id] || 0) > 0)
    : conversations;

  const totalUnread = conversations.reduce(
    (s, c) => s + (c.unreadCount?.[user._id] || 0), 0
  );

  return (
    <>
      {/*
       * El sidebar tiene 3 zonas:
       * 1. Header (logo + botón nuevo chat)
       * 2. Lista de conversaciones (flex-1, scrollea)
       * 3. Barra de usuario inferior (fija abajo)
       */}
      <aside className="w-full md:w-[240px] bg-deep flex flex-col border-r border-white/5 overflow-hidden flex-shrink-0 h-full">

        {/* ── ZONA 1: Header ── */}
        <div className="p-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl font-extrabold text-white tracking-tight">
              Nexus<span className="text-accent">Chat</span>
            </h1>
            <button
              onClick={() => setShowNewChat(true)}
              className="w-9 h-9 rounded-xl bg-accent hover:bg-accent-bright flex items-center justify-center transition-colors text-white font-bold text-xl"
              title="Nuevo chat"
            >
              +
            </button>
          </div>
          <div
            className="flex items-center gap-2 bg-input rounded-full px-3 py-2.5 border border-white/5 cursor-text"
            onClick={() => setShowNewChat(true)}
          >
            <span className="text-text-muted text-sm">🔍</span>
            <span className="text-text-muted text-sm">Buscar o nuevo chat...</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-1 flex-shrink-0">
          {[['all', 'Todos'], ['unread', 'No leídos']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setActiveTab(val)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === val
                  ? 'bg-active text-white'
                  : 'text-text-secondary hover:bg-hover'
              }`}
            >
              {label}
              {val === 'unread' && totalUnread > 0 && (
                <span className="ml-1 text-accent font-bold">{totalUnread}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── ZONA 2: Lista de conversaciones ── */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {filtered.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-text-muted text-sm">
                {activeTab === 'unread'
                  ? 'Sin mensajes no leídos'
                  : 'Sin conversaciones aún'}
              </p>
              {activeTab === 'all' && (
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-3 text-accent text-sm hover:text-accent-bright transition-colors"
                >
                  Iniciar una conversación →
                </button>
              )}
            </div>
          )}

          {filtered.map((conv) => {
            const other    = getOther(conv);
            const unread   = conv.unreadCount?.[user._id] || 0;
            const isOnline = onlineUsers.includes(other?._id);
            const isActive = selectedConv?._id === conv._id;

            return (
              <button
                key={conv._id}
                onClick={() => handleSelect(conv)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-0.5 text-left transition-colors ${
                  isActive ? 'bg-active' : 'hover:bg-hover'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar user={other} size={42} />
                  <StatusDot isOnline={isOnline} size={12} borderColor="#13141a" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm font-medium truncate ${
                      isActive ? 'text-white' : 'text-text-primary'
                    }`}>
                      {other?.username || 'Usuario'}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-xs text-text-muted flex-shrink-0">
                        {formatTime(conv.updatedAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-xs text-text-muted truncate">
                      {conv.lastMessage
                        ? conv.lastMessage.mediaName === 'Sticker'
                          ? '🎭 Sticker'
                          : conv.lastMessage.mediaType === 'image' && conv.lastMessage.mediaMimeType === 'image/gif'
                          ? '🎬 GIF'
                          : conv.lastMessage.mediaType === 'image'
                          ? '📷 Foto'
                          : conv.lastMessage.mediaType === 'video'
                          ? '🎥 Video'
                          : conv.lastMessage.mediaType === 'audio'
                          ? '🎤 Audio'
                          : conv.lastMessage.mediaType === 'document'
                          ? '📄 Archivo'
                          : conv.lastMessage.text || 'Inicia la conversación...'
                        : 'Inicia la conversación...'}
                    </span>
                    {unread > 0 && (
                      <span className="min-w-[20px] h-[20px] bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── ZONA 3: Barra de usuario inferior ── */}
        <div className="flex-shrink-0 border-t border-white/5 bg-deep">
          <div className="flex items-center gap-3 px-4 py-3">

            {/* Avatar del usuario con punto verde */}
            <div className="relative flex-shrink-0">
              <Avatar user={user} size={38} />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent-green border-2 border-deep" />
            </div>

            {/* Nombre y tag */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.username}
              </p>
              <p className="text-xs text-text-muted leading-tight">En línea</p>
            </div>

            {/* Botón Configuración */}
            <button
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-hover transition-colors flex-shrink-0"
              title="Configuración"
            >
              {/* Ícono engranaje SVG nativo */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l-1.41-1.41M6.34 6.34L4.93 4.93"/>
              </svg>
            </button>

            {/* Botón Cerrar sesión */}
            <button
              onClick={() => {
                localStorage.removeItem('nexus_token');
                localStorage.removeItem('nexus_user');
                window.location.href = '/';
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors flex-shrink-0"
              title="Cerrar sesión"
            >
              {/* Ícono salir SVG nativo */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>

          </div>
        </div>

      </aside>

      {/* Modal nuevo chat */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onSelectConversation={(conv) => {
            setConversations((prev) =>
              prev.find((c) => c._id === conv._id) ? prev : [conv, ...prev]
            );
            handleSelect(conv);
          }}
        />
      )}
    </>
  );
};

export default Sidebar;