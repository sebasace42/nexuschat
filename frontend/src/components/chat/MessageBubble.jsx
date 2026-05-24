import { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../ui/Avatar';

const QUICK = ['👍','❤️','😂','🔥','😮','👏'];

const MessageBubble = ({ message, isOwn, conversationId, showAvatar }) => {
  const { socket }  = useSocket();
  const [showReact, setShowReact] = useState(false);

  const react = (emoji) => {
    socket?.emit('message:react', { messageId: message._id, emoji, conversationId });
    setShowReact(false);
  };

  const time = new Date(message.createdAt)
    .toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  const grouped = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc;
  }, {});

  return (
    <div className={`flex gap-3 group relative ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-2' : 'mt-0.5'}`}
      onMouseLeave={() => setShowReact(false)}>
      <div className="w-9 flex-shrink-0">
        {showAvatar && !isOwn && <Avatar user={message.sender} size={36} />}
      </div>
      <div className={`max-w-[72%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {showAvatar && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className="text-sm font-semibold" style={{ color: message.sender?.avatarColor || '#a8a0ff' }}>
              {message.sender?.username}
            </span>
            <span className="text-xs text-text-muted">{time}</span>
          </div>
        )}
        <div className="relative">
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed msg-enter
            ${isOwn ? 'bg-accent text-white rounded-br-md' : 'bg-input text-text-primary rounded-bl-md'}`}>
            {message.text}
            {isOwn && (
              <div className="flex items-center gap-1 mt-0.5 justify-end">
                <span className="text-[10px] text-white/50">{time}</span>
                <span className={`text-xs ${message.readBy?.length > 1 ? 'text-accent-teal' : 'text-white/40'}`}>✓✓</span>
              </div>
            )}
          </div>
          <button
            className={`absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-panel border border-white/10 flex items-center justify-center text-xs ${isOwn ? '-left-8' : '-right-8'}`}
            onClick={() => setShowReact((v) => !v)}>
            😊
          </button>
          {showReact && (
            <div className={`absolute bottom-full mb-1 flex gap-1 bg-panel border border-white/10 rounded-full px-2 py-1 shadow-xl z-10 ${isOwn ? 'right-0' : 'left-0'}`}>
              {QUICK.map((e) => (
                <button key={e} onClick={() => react(e)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition-transform">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        {grouped && Object.keys(grouped).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(grouped).map(([emoji, count]) => (
              <button key={emoji} onClick={() => react(emoji)}
                className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-xs hover:bg-white/10 transition-colors">
                {emoji} <span className="text-text-secondary">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default MessageBubble;