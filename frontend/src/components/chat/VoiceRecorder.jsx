import { useState, useRef, useEffect } from 'react';

const VoiceRecorder = ({ onSend, onCancel }) => {
  const [seconds,    setSeconds]    = useState(0);
  const [recording,  setRecording]  = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);
  const streamRef        = useRef(null);

  // Iniciar grabación al montar el componente
  useEffect(() => {
    startRecording();
    return () => stopEverything();
  }, []);

  const startRecording = async () => {
    try {
      // Pedir permiso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Crear el MediaRecorder con el stream del micrófono
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Cada vez que hay datos disponibles, guardarlos
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(100); // capturar cada 100ms
      setRecording(true);

      // Contador de segundos
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accediendo al micrófono:', err);
      alert('No se pudo acceder al micrófono. Verifica los permisos.');
      onCancel();
    }
  };

  const stopEverything = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    // Detener todas las pistas del stream para apagar el mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  // Enviar el audio grabado
  const handleSend = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `voice-${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      onSend(file);
    };

    stopEverything();
    setRecording(false);
  };

  // Cancelar sin enviar
  const handleCancel = () => {
    stopEverything();
    onCancel();
  };

  // Formatear tiempo mm:ss
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-accent/10 border border-accent/20 rounded-2xl">

      {/* Indicador de grabación pulsante */}
      <div className="flex items-center gap-2 flex-1">
        <span className="w-3 h-3 rounded-full bg-accent-red animate-pulse flex-shrink-0" />
        <span className="text-sm font-medium text-white">
          Grabando...
        </span>
        <span className="text-sm text-accent-bright font-mono">
          {formatTime(seconds)}
        </span>
      </div>

      {/* Botón cancelar */}
      <button
        onClick={handleCancel}
        className="
          w-9 h-9 rounded-xl
          flex items-center justify-center
          text-text-muted hover:text-accent-red
          hover:bg-accent-red/10
          transition-colors flex-shrink-0
        "
        title="Cancelar grabación"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Botón enviar */}
      <button
        onClick={handleSend}
        className="
          w-9 h-9 rounded-xl
          flex items-center justify-center
          bg-accent hover:bg-accent-bright
          text-white transition-colors flex-shrink-0
        "
        title="Enviar mensaje de voz"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>

    </div>
  );
};

export default VoiceRecorder;