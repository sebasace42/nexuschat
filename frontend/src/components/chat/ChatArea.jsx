import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useAuth }   from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MessageBubble from './MessageBubble';
import MessageInput  from './MessageInput';
import Avatar        from '../ui/Avatar';
import StatusDot     from '../ui/StatusDot';

const ChatArea = ({ conversation }) => {
  const { user }          = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const bottomRef = useRef(null);

  const other       = conversation?.participants.find((p) => p._id !== user._id);
  const isOtherOnline = onlineUsers.includes(other?._id);

  useEffect(() => {
    if (!conversation) return;
    setMessages([]); setTypingUsers([]);
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
      setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, reactions } : m));
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
    if (msgs[i-1].sender._id !== msgs[i].sender._id) return true;
    return (new Date(msgs[i].createdAt) - new Date(msgs[i-1].createdAt)) / 60000 > 5;
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-main">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">NexusChat</h2>
          <p className="text-text-muted text-sm">Selecciona una conversación para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-main overflow-hidden">
      <div className="h-[52px] px-4 flex items-center gap-3 border-b border-white/5 flex-shrink-0">
        <div className="relative flex-shrink-0">
          <Avatar user={other} size={34} />
          <StatusDot isOnline={isOtherOnline} size={10} borderColor="#1f2029" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-white text-sm truncate">{other?.username}</p>
          <p className="text-xs">
            {isOtherOnline
              ? <span className="text-accent-green">● En línea</span>
              : <span className="text-text-muted">Desconectado</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {['📹','📞','🔍'].map((icon) => (
            <button key={icon} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-hover transition-colors">
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar user={other} size={64} />
            <h3 className="font-display font-bold text-white text-lg mt-4">{other?.username}</h3>
            <p className="text-text-muted text-sm mt-1">¡Envía el primer mensaje! 👋</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={msg._id} message={msg}
            isOwn={msg.sender._id === user._id}
            conversationId={conversation._id}
            showAvatar={showAvatar(messages, i)}
          />
        ))}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 mt-2 px-2">
            <div className="flex gap-1">
              {[1,2,3].map((n) => (
                <span key={n} className={`typing-dot w-1.5 h-1.5 rounded-full bg-text-muted`} />
              ))}
            </div>
            <span className="text-xs text-text-muted">{other?.username} está escribiendo...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput conversationId={conversation._id} />
    </div>
  );
};
export default ChatArea;