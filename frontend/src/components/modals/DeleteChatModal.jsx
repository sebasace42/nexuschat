import { useState } from 'react';

const DeleteChatModal = ({ onClose, onConfirm, contactName, isDeleting }) => {
  const [deleteMedia, setDeleteMedia] = useState(true);

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
            ¿Quieres eliminar este chat?
          </h2>
        </div>

        {/* Checkbox multimedia — igual que WhatsApp */}
        <div
          className="mx-6 mb-5 flex items-start gap-4 cursor-pointer"
          onClick={() => setDeleteMedia((v) => !v)}
        >
          {/*
           * Checkbox personalizado con el estilo de NexusChat.
           * deleteMedia === true → fondo accent (morado) + check
           * deleteMedia === false → borde blanco vacío
           */}
          <div className={`
            w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5
            border-2 transition-all duration-150
            ${deleteMedia
              ? 'bg-accent border-accent'
              : 'bg-transparent border-white/40'
            }
          `}>
            {deleteMedia && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>

          <p className="text-text-primary text-sm leading-relaxed">
            Eliminar también de la galería del dispositivo los archivos multimedia recibidos en este chat
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mx-0" />

        {/* Botones */}
        <div className="flex">

          {/* Cancelar */}
          <button
            onClick={onClose}
            disabled={isDeleting}
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

          {/* Eliminar chat */}
          <button
            onClick={() => onConfirm(deleteMedia)}
            disabled={isDeleting}
            className="
              flex-1 py-4 text-sm font-semibold
              text-accent hover:text-accent-bright
              hover:bg-accent/5 active:bg-accent/10
              transition-colors
              disabled:opacity-50
            "
          >
            {isDeleting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <span>Eliminando...</span>
              </div>
            ) : (
              'Eliminar chat'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeleteChatModal;