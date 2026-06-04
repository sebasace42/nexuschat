import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import EmojiPicker   from './EmojiPicker';
import GifPicker     from './GifPicker';
import VoiceRecorder from './VoiceRecorder';

const MessageInput = ({ conversationId, disabled }) => {
  const { socket }                = useSocket();
  const [text,        setText]        = useState('');
  const [showEmoji,   setShowEmoji]   = useState(false);
  const [showGif,     setShowGif]     = useState(false);
  const [showVoice,   setShowVoice]   = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [preview,     setPreview]     = useState(null);

  const textareaRef   = useRef(null);
  const typingRef     = useRef(null);
  const fileInputRef  = useRef(null);
  const imageInputRef = useRef(null);
  const gifButtonRef  = useRef(null);

  // ── Auto-resize textarea ──────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }, [text]);

  // ── Enviar texto por socket ───────────────────────────────────
  const sendText = () => {
    if (!text.trim() || !socket || disabled) return;
    socket.emit('message:send', { conversationId, text: text.trim() });
    setText('');
    stopTyping();
    textareaRef.current?.focus();
  };

  // ── Enviar archivo a Cloudinary ───────────────────────────────
  const sendFile = async (file) => {
    if (!file || !conversationId) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);
      if (text.trim()) formData.append('text', text.trim());

      const { data: message } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      socket?.emit('message:new_media', { message, conversationId });
      setText('');
      setPreview(null);
      textareaRef.current?.focus();
    } catch (err) {
      setUploadError(err.response?.data?.message ?? 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  // ── Enviar audio grabado ──────────────────────────────────────
  const sendVoice = async (audioFile) => {
    setShowVoice(false);
    if (!audioFile || !conversationId) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('conversationId', conversationId);

      const { data: message } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      socket?.emit('message:new_media', { message, conversationId });
    } catch (err) {
      setUploadError('Error al enviar el audio');
    } finally {
      setUploading(false);
    }
  };

  // ── Enviar GIF desde GIPHY ────────────────────────────────────
  const sendGif = async (gifUrl) => {
    if (!gifUrl || !conversationId || disabled) return;
    setShowGif(false);
    try {
      const { data: message } = await api.post('/upload/gif', {
        conversationId,
        gifUrl,
      });
      socket?.emit('message:new_media', { message, conversationId });
    } catch (err) {
      console.error('Error enviando GIF:', err);
    }
  };

  // ── Seleccionar imagen/video ──────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const url = URL.createObjectURL(file);
    setPreview({
      file, url,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name,
      size: file.size,
    });
    setUploadError('');
  };

  // ── Seleccionar archivo genérico ──────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setPreview({ file, url: null, type: 'file', name: file.name, size: file.size });
    setUploadError('');
  };

  // ── Cancelar preview ──────────────────────────────────────────
  const cancelPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setUploadError('');
  };

  // ── Enviar (texto o archivo) ──────────────────────────────────
  const handleSend = () => {
    if (preview) sendFile(preview.file);
    else sendText();
  };

  // ── Typing indicators ─────────────────────────────────────────
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

  // ── Formatear tamaño ──────────────────────────────────────────
  const formatSize = (bytes) => {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canSend = (preview || text.trim()) && !disabled && !uploading;

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pb-4 flex-shrink-0">

      {/* ── GRABADOR DE VOZ ───────────────────────────────────── */}
      {showVoice && (
        <div className="mb-2">
          <VoiceRecorder
            onSend={sendVoice}
            onCancel={() => setShowVoice(false)}
          />
        </div>
      )}

      {/* ── PREVIEW DEL ARCHIVO ──────────────────────────────── */}
      {preview && !showVoice && (
        <div className="mb-2 bg-input border border-white/10 rounded-xl p-3 flex items-center gap-3">
          {preview.type === 'image' && preview.url ? (
            <img
              src={preview.url}
              alt="preview"
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{preview.name}</p>
            <p className="text-xs text-text-muted mt-0.5">{formatSize(preview.size)}</p>
            {uploading && (
              <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full animate-pulse w-2/3" />
              </div>
            )}
          </div>

          {!uploading && (
            <button
              onClick={cancelPreview}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ── ERROR DE SUBIDA ───────────────────────────────────── */}
      {uploadError && (
        <p className="mb-2 text-xs text-accent-red bg-accent-red/10 px-3 py-2 rounded-lg">
          {uploadError}
        </p>
      )}

      {/* ── INPUT PRINCIPAL (oculto mientras graba voz) ──────── */}
      {!showVoice && (
        <div className={`
          bg-input border rounded-2xl overflow-hidden transition-colors
          ${disabled
            ? 'border-white/3 opacity-60'
            : 'border-white/5 focus-within:border-accent/30'
          }
        `}>

          {/* ── Barra de herramientas superior ── */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">

            {/* Inputs ocultos */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,audio/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Botón imagen/video */}
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled || uploading}
              title="Enviar imagen o video"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors disabled:opacity-40"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>

            {/* Botón archivo */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              title="Adjuntar archivo"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors disabled:opacity-40"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            {/* Botón GIF */}
            <div className="relative">
              <button
                ref={gifButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGif((v) => !v);
                  setShowEmoji(false);
                }}
                disabled={disabled}
                title="Enviar GIF"
                className={`
                  w-7 h-7 rounded-lg flex items-center justify-center
                  text-[11px] font-bold transition-colors disabled:opacity-40
                  ${showGif
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-accent-bright hover:bg-hover'
                  }
                `}
              >
                GIF
              </button>
              {showGif && (
                <GifPicker
                  onSelect={sendGif}
                  onClose={() => setShowGif(false)}
                  anchorRef={gifButtonRef}
                />
              )}
            </div>

            <div className="flex-1" />

            {/* Botones de formato */}
            <button
              onClick={() => setText((p) => `**${p}**`)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors font-bold text-xs"
            >B</button>
            <button
              onClick={() => setText((p) => `_${p}_`)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors italic text-xs"
            >I</button>
            <button
              onClick={() => setText((p) => `\`${p}\``)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors text-xs"
            >&lt;/&gt;</button>
          </div>

          {/* ── Área textarea + emoji + micrófono/enviar ── */}
          <div className="flex items-end gap-2 px-3 py-2.5">

            {/* Emoji picker */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => {
                  setShowEmoji((v) => !v);
                  setShowGif(false);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-bright hover:bg-hover transition-colors"
              >
                😊
              </button>
              {showEmoji && (
                <EmojiPicker
                  onSelect={(e) => setText((p) => p + e)}
                  onClose={() => setShowEmoji(false)}
                />
              )}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={disabled || uploading}
              placeholder={
                uploading ? 'Subiendo archivo...'  :
                disabled  ? 'Selecciona una conversación...' :
                preview   ? 'Agrega un mensaje (opcional)...' :
                'Escribe un mensaje... (Enter para enviar)'
              }
              rows={1}
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted text-sm resize-none outline-none leading-relaxed max-h-[150px] overflow-y-auto"
            />

            {/*
             * BOTÓN DINÁMICO:
             * Sin texto ni archivo → micrófono 🎤
             * Con texto o archivo  → enviar ➤
             */}
            {!text.trim() && !preview ? (
              <button
                onClick={() => setShowVoice(true)}
                disabled={disabled}
                title="Mensaje de voz"
                className="
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  bg-accent hover:bg-accent-bright text-white
                  transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  transition-all duration-200
                  ${canSend
                    ? 'bg-accent hover:bg-accent-bright'
                    : 'bg-white/5 opacity-40 cursor-not-allowed'
                  }
                `}
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="text-white text-sm">➤</span>
                )}
              </button>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default MessageInput;