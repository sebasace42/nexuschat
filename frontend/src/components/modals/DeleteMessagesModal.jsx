import React from 'react';

const DeleteMessagesModal = ({
  count,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-panel border border-white/10 rounded-3xl p-6 max-w-sm w-11/12 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Título */}
        <h2 className="text-xl font-semibold text-white mb-6">
          ¿Quieres eliminar {count} {count === 1 ? 'mensaje' : 'mensajes'}?
        </h2>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="
              flex-1 py-3 rounded-xl
              border border-white/10
              text-text-secondary font-medium
              hover:bg-hover hover:text-text-primary
              active:bg-active
              transition-colors
              disabled:opacity-50
            "
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="
              flex-1 py-3 rounded-xl
              bg-accent hover:bg-accent-bright
              text-white font-medium
              transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
            "
          >
            {isDeleting && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isDeleting ? 'Eliminando...' : `Eliminar ${count === 1 ? 'mensaje' : 'mensajes'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteMessagesModal;