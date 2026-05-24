import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth }   from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar    from '../ui/Avatar';
import StatusDot from '../ui/StatusDot';
import NewChatModal from '../modals/NewChatModal';

const Sidebar = ({ selectedConv, onSelectConversation }) => {
  const { user }                = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [showNewChat,   setShowNewChat]   = useState(false);
  const [activeTab,     setActiveTab]     = useState('all');

  // useEffect 1 — cargar conversaciones cuando el usuario esté listo
  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  // useEffect 2 — unirse a las salas cuando socket Y conversaciones estén listos
  useEffect(() => {
    if (!socket || conversations.length === 0) return;
    socket.emit('conversations:join', conversations.map((c) => c._id));
  }, [socket, conversations]);

  // useEffect 3 — escuchar actualizaciones de conversaciones en tiempo real
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

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/conversations');
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
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
    const date = new Date(d);
    const now  = new Date();
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
      <aside className="w-[240px] bg-deep flex flex-col border-r border-white/5 overflow-hidden flex-shrink-0">

        {/* Header */}
        <div className="p-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl font-extrabold text-white tracking-tight">
              Nexus<span className="text-accent">Chat</span>
            </h1>
            <button
              onClick={() => setShowNewChat(true)}
              className="w-8 h-8 rounded-lg bg-accent hover:bg-accent-bright flex items-center justify-center transition-colors text-white font-bold text-lg"
              title="Nuevo chat"
            >
              +
            </button>
          </div>
          <div
            className="flex items-center gap-2 bg-input rounded-full px-3 py-2 border border-white/5 cursor-text"
            onClick={() => setShowNewChat(true)}
          >
            <span className="text-text-muted text-xs">🔍</span>
            <span className="text-text-muted text-xs">Buscar o nuevo chat...</span>
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

        {/* Lista de conversaciones */}
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-left transition-colors ${
                  isActive ? 'bg-active' : 'hover:bg-hover'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar user={other} size={38} />
                  <StatusDot isOnline={isOnline} size={11} borderColor="#13141a" />
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
                      {conv.lastMessage?.text || 'Inicia la conversación...'}
                    </span>
                    {unread > 0 && (
                      <span className="min-w-[18px] h-[18px] bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
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