import { useState } from 'react';

/*
 * Ubicación: src/components/modals/CreateChannelModal.jsx
 */
const COLORS = ['#7c6cf6', '#f97066', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];

const CreateChannelModal = ({ onClose, onCreate, creating = false }) => {
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor]             = useState(COLORS[0]);

  const canCreate = name.trim().length > 0 && !creating;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate({ name: name.trim(), description: description.trim(), avatarColor: color });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-panel border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200">

        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-hover transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <h2 className="text-base font-semibold text-white">Nuevo canal</h2>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Preview del avatar con la letra inicial */}
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {name.trim() ? name.trim()[0].toUpperCase() : '📢'}
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-white/60 ring-offset-2 ring-offset-panel' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div>
            <label className="text-xs text-text-muted mb-2 block">Nombre del canal</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Ej. Noticias del proyecto"
              autoFocus
              className="w-full bg-input border border-white/10 focus:border-accent rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-2 block">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="¿De qué trata este canal?"
              className="w-full bg-input border border-white/10 focus:border-accent rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted outline-none transition-colors resize-none"
            />
          </div>

          <p className="text-[11px] text-text-muted">
            Solo tú podrás publicar en este canal. Cualquiera podrá seguirlo y ver tus publicaciones.
          </p>
        </div>

        <div className="px-5 py-4 border-t border-white/5 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-bright disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {creating ? 'Creando...' : 'Crear canal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChannelModal;