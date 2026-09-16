const BlockUserModal = ({ onClose, onConfirm, contactName, isBlocking }) => {
  return (
    /*
     * Overlay oscuro que cubre toda la pantalla.
     * Al tocar fuera del modal se cierra.
     */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-panel border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">

        {/* Título */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="font-display text-xl font-bold text-white leading-tight">
            ¿Bloquear a {contactName}?
          </h2>
        </div>

        {/* Descripción */}
        <div className="mx-6 mb-5">
          <p className="text-text-primary text-sm leading-relaxed">
            {contactName} ya no podrá escribirte ni ver tu foto de perfil actualizada.
            No verás sus mensajes nuevos. Puedes desbloquearlo cuando quieras.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mx-0" />

        {/* Botones */}
        <div className="flex">

          {/* Cancelar */}
          <button
            onClick={onClose}
            disabled={isBlocking}
            className="
              flex-1 py-4 text-sm font-semibold
              text-text-secondary hover:text-text-primary
              hover:bg-white/5 active:bg-white/10
              transition-colors
              disabled:opacity-50
            "
          >
            Cancelar
          </button>

          {/* Divider vertical */}
          <div className="w-px bg-white/5" />

          {/* Bloquear usuario */}
          <button
            onClick={onConfirm}
            disabled={isBlocking}
            className="
              flex-1 py-4 text-sm font-semibold
              text-accent-red hover:text-accent-red
              hover:bg-accent-red/5 active:bg-accent-red/10
              transition-colors
              disabled:opacity-50
            "
          >
            {isBlocking ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-accent-red/30 border-t-accent-red rounded-full animate-spin" />
                <span>Bloqueando...</span>
              </div>
            ) : (
              'Bloquear usuario'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BlockUserModal;