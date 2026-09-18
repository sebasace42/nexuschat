import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * ToastContext — reemplazo de window.alert() / window.confirm().
 *
 * POR QUÉ EXISTE:
 * alert()/confirm() son APIs del navegador. Aunque la app esté
 * "instalada" (PWA / WebView), siguen abriendo el cuadro nativo con
 * el dominio ("nexuschat-elz.pages.dev dice"). No se puede re-estilizar.
 * Este componente los sustituye por una notificación propia, con el
 * mismo look & feel del resto de la app.
 *
 * CÓMO INSTALARLO:
 * 1) Envuelve tu app (normalmente en main.jsx o App.jsx) con el provider:
 *
 *    import { ToastProvider } from './components/ui/ToastContext';
 *    <ToastProvider>
 *      <App />
 *    </ToastProvider>
 *
 * 2) En cualquier componente hijo:
 *
 *    import { useToast } from '../ui/ToastContext';
 *    const { showToast } = useToast();
 *    showToast('No se pudo eliminar los mensajes', 'error');
 *
 *    Tipos disponibles: 'error' | 'success' | 'info' (default: 'info')
 */

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              onClick={() => dismissToast(t.id)}
              className={`
                pointer-events-auto cursor-pointer
                px-4 py-3 rounded-2xl shadow-2xl border
                text-sm font-medium text-white
                animate-in fade-in slide-in-from-top-2 duration-200
                ${t.type === 'error'   ? 'bg-accent-red/95 border-accent-red/40' : ''}
                ${t.type === 'success' ? 'bg-emerald-600/95 border-emerald-500/40' : ''}
                ${t.type === 'info'    ? 'bg-[#1a1a1f]/95 border-white/10' : ''}
              `}
            >
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return ctx;
};