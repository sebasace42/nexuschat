{/* Botón GIF */}
<div className="relative">
  <button
    onClick={() => { setShowGif((v) => !v); setShowEmoji(false); }}
    className={`
      w-7 h-7 rounded-lg flex items-center justify-center
      text-xs font-bold transition-colors
      ${showGif
        ? 'bg-accent text-white'
        : 'text-text-muted hover:text-accent-bright hover:bg-hover'
      }
    `}
    title="Enviar GIF"
  >
    GIF
  </button>
  {showGif && (
    <GifPicker
      onSelect={sendGif}
      onClose={() => setShowGif(false)}
    />
  )}
</div>