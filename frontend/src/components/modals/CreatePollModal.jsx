import { useState } from 'react';

/*
 * Ubicación: src/components/modals/CreatePollModal.jsx
 *
 * Pantalla "Crea una encuesta" (pregunta + opciones + permitir
 * varias respuestas). onSend recibe { question, options, allowMultiple }
 * ya limpios (sin opciones vacías, mínimo 2).
 */
const MAX_OPTIONS = 8;

const CreatePollModal = ({ onClose, onSend, sending = false }) => {
  const [question, setQuestion]           = useState('');
  const [options, setOptions]             = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const updateOption = (i, value) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, '']);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return; // mínimo 2 opciones, como WhatsApp
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSend = question.trim().length > 0 && cleanOptions.length >= 2 && !sending;

  const handleSend = () => {
    if (!canSend) return;
    onSend({
      question: question.trim(),
      options:  cleanOptions,
      allowMultiple,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-panel border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-hover transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <h2 className="text-base font-semibold text-white">Crea una encuesta</h2>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Pregunta */}
          <div>
            <label className="text-xs text-text-muted mb-2 block">Pregunta</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={300}
              placeholder="Haz una pregunta."
              autoFocus
              className="
                w-full bg-input border border-white/10 focus:border-accent
                rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted
                outline-none transition-colors
              "
            />
          </div>

          {/* Opciones */}
          <div>
            <label className="text-xs text-text-muted mb-2 block">Opciones</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    maxLength={100}
                    placeholder={`Opción ${i + 1}`}
                    className="
                      flex-1 bg-input border border-white/10 focus:border-accent
                      rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted
                      outline-none transition-colors
                    "
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                      title="Quitar opción"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < MAX_OPTIONS && (
              <button
                onClick={addOption}
                className="mt-2 text-sm font-medium text-accent hover:text-accent-bright transition-colors"
              >
                + Añadir opción
              </button>
            )}
          </div>

          {/* Permitir varias respuestas */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">Permitir varias respuestas</span>
            <button
              onClick={() => setAllowMultiple((v) => !v)}
              className={`
                w-11 h-6 rounded-full flex-shrink-0 transition-colors relative
                ${allowMultiple ? 'bg-accent' : 'bg-white/10'}
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform
                  ${allowMultiple ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Footer: enviar */}
        <div className="px-5 py-4 border-t border-white/5 flex justify-end flex-shrink-0">
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="
              w-12 h-12 rounded-full
              bg-accent hover:bg-accent-bright
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white flex items-center justify-center
              transition-colors
            "
            title="Enviar encuesta"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePollModal;