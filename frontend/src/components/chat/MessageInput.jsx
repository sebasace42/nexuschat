import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import EmojiPicker from './EmojiPicker';

const MessageInput = ({ conversationId, disabled }) => {
  const { socket }    = useSocket();
  const [text, setText]         = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef  = useRef(null);
  const typingRef    = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }, [text]);

  const send = () => {
    if (!text.trim() || !socket || disabled) return;
    socket.emit('message:send', { conversationId, text: text.trim() });
    setText('');
    stopTyping();
    textareaRef.current?.focus();
  };

  const stopTyping = () => {
    socket?.emit('typing:stop', { conversationId });
    clearTimeout(typingRef.current);
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket) return;
    socket.emit('typing:start', { conversationId });
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(stopTyping, 2000);
  };

  return (
    <div className="px-4 pb-4 flex-shrink-0">
      <div className={`bg-input border rounded-2xl overflow-hidden transition-colors ${disabled ? 'border-white/3 opacity-60' : 'border-white/5 focus-within:border-accent/30'}`}>
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
          {['📎','🖼️'].map((icon) => (
            <button key={icon} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors text-sm">
              {icon}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => setText((p) => `**${p}**`)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors font-bold text-xs">B</button>
          <button onClick={() => setText((p) => `_${p}_`)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors italic text-xs">I</button>
          <button onClick={() => setText((p) => `\`${p}\``)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors text-xs">&lt;/&gt;</button>
        </div>
        <div className="flex items-end gap-2 px-3 py-2.5">
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowEmoji((v) => !v)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors">
              😊
            </button>
            {showEmoji && <EmojiPicker onSelect={(e) => setText((p) => p + e)} onClose={() => setShowEmoji(false)} />}
          </div>
          <textarea ref={textareaRef} value={text} onChange={handleTyping}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={disabled}
            placeholder={disabled ? 'Selecciona una conversación...' : 'Escribe un mensaje... (Enter para enviar)'}
            rows={1}
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted text-sm resize-none outline-none leading-relaxed max-h-[150px] overflow-y-auto"
          />
          <button onClick={send} disabled={!text.trim() || disabled}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${text.trim() && !disabled ? 'bg-accent hover:bg-accent-bright' : 'bg-white/5 opacity-40 cursor-not-allowed'}`}>
            <span className="text-white text-sm">➤</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default MessageInput;