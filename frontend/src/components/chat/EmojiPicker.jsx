const EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😅','😭',
                '🎉','🔥','💯','👍','👎','👏','🙌','❤️',
                '✅','⚡','🚀','🎮','💻','🌟','😴','🤝'];

const EmojiPicker = ({ onSelect, onClose }) => (
  <div className="absolute bottom-full mb-2 left-0 bg-panel border border-white/10 rounded-2xl p-3 shadow-2xl z-50 w-64">
    <div className="flex items-center justify-between mb-2 px-1">
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Emojis</span>
      <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm">✕</button>
    </div>
    <div className="grid grid-cols-8 gap-1">
      {EMOJIS.map((emoji) => (
        <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }}
          className="w-7 h-7 flex items-center justify-center text-lg hover:bg-hover rounded-lg transition-colors">
          {emoji}
        </button>
      ))}
    </div>
  </div>
);
export default EmojiPicker;