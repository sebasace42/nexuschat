{/* ══ TOPBAR — sticky siempre arriba ══ */}
<div
  className="flex-shrink-0 px-3 flex items-center gap-2 border-b border-white/5 bg-main"
  style={{ height: '56px', minHeight: '56px' }}
>
  {/* Botón volver — solo móvil */}
  <button
    onClick={onBack}
    className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-hover transition-colors flex-shrink-0"
    aria-label="Volver"
  >
    <svg
      width="22"
      height="22"
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

  {/* Avatar */}
  <div className="relative flex-shrink-0">
    <Avatar user={other} size={34} />
    <StatusDot isOnline={isOtherOnline} size={10} borderColor="#1f2029" />
  </div>

  {/* Nombre */}
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