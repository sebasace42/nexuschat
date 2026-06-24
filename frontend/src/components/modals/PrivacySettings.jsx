import { useState } from 'react';
import api         from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/*
 * PrivacySettings — Panel que se monta dentro del modal de Configuración
 * cuando el usuario hace clic en "Privacidad".
 *
 * USO en tu SettingsModal.jsx (o como se llame):
 *
 *   import PrivacySettings from './PrivacySettings';
 *
 *   // Dentro del render, cuando activeSection === 'privacy':
 *   <PrivacySettings onBack={() => setActiveSection(null)} />
 */

const PrivacySettings = ({ onBack }) => {
  const { user, setUser } = useAuth();
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  const toggle = async (value) => {
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await api.patch('/users/privacy', { isPrivate: value });
      setIsPrivate(data.isPrivate);
      // Actualizar el contexto global del usuario
      if (setUser) {
        setUser((prev) => ({ ...prev, isPrivate: data.isPrivate }));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Header con botón volver ── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
        <h3 className="text-white font-semibold text-base">🔒 Privacidad</h3>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* ── Card principal: tipo de cuenta ── */}
        <div className="bg-[#1a1a1f] border border-white/8 rounded-2xl overflow-hidden">

          {/* Opción: Público */}
          <button
            onClick={() => !saving && toggle(false)}
            disabled={saving}
            className={`w-full flex items-start gap-4 px-5 py-4 transition-colors hover:bg-white/3 ${
              !isPrivate ? 'bg-accent/8 border-b border-accent/20' : 'border-b border-white/5'
            }`}
          >
            {/* Icono */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              !isPrivate ? 'bg-accent/20' : 'bg-white/5'
            }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={!isPrivate ? 'text-accent' : 'text-text-muted'}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>

            {/* Texto */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold ${!isPrivate ? 'text-white' : 'text-text-primary'}`}>
                  Cuenta pública
                </p>
                {!isPrivate && (
                  <span className="text-[10px] font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full">
                    ACTIVO
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Cualquier persona puede escribirte mensajes y ver tus estados sin necesidad de ser tu contacto.
              </p>
            </div>

            {/* Radio */}
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
              !isPrivate ? 'border-accent bg-accent' : 'border-white/20'
            }`}>
              {!isPrivate && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </button>

          {/* Opción: Privado */}
          <button
            onClick={() => !saving && toggle(true)}
            disabled={saving}
            className={`w-full flex items-start gap-4 px-5 py-4 transition-colors hover:bg-white/3 ${
              isPrivate ? 'bg-accent/8' : ''
            }`}
          >
            {/* Icono */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              isPrivate ? 'bg-accent/20' : 'bg-white/5'
            }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={isPrivate ? 'text-accent' : 'text-text-muted'}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            {/* Texto */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold ${isPrivate ? 'text-white' : 'text-text-primary'}`}>
                  Cuenta privada
                </p>
                {isPrivate && (
                  <span className="text-[10px] font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full">
                    ACTIVO
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Solo tus contactos aprobados pueden escribirte y ver tus estados. Las personas deben enviarte una solicitud primero.
              </p>
            </div>

            {/* Radio */}
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
              isPrivate ? 'border-accent bg-accent' : 'border-white/20'
            }`}>
              {isPrivate && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        </div>

        {/* ── Explicación detallada ── */}
        <div className="bg-[#1a1a1f] border border-white/8 rounded-2xl px-5 py-4 space-y-3">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">
            ¿Qué cambia con cada opción?
          </p>

          <div className="space-y-2.5">
            {[
              {
                icon: '💬',
                label: 'Mensajes',
                pub:     'Cualquiera puede escribirte',
                priv:    'Solo contactos aprobados',
              },
              {
                icon: '⭕',
                label: 'Estados',
                pub:     'Visibles para todos',
                priv:    'Solo contactos aprobados',
              },
              {
                icon: '🔍',
                label: 'Búsqueda',
                pub:     'Apareces en los resultados',
                priv:    'Apareces, pero con candado',
              },
              {
                icon: '✋',
                label: 'Solicitudes',
                pub:     'Se aceptan automáticamente',
                priv:    'Tú decides quién te sigue',
              },
            ].map(({ icon, label, pub, priv }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-base flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium">{label}</p>
                  <p className={`text-xs mt-0.5 ${isPrivate ? 'text-text-muted' : 'text-accent'}`}>
                    {!isPrivate ? pub : (
                      <span className="text-text-muted">{priv}</span>
                    )}
                  </p>
                  {isPrivate && (
                    <p className="text-xs text-text-muted line-through opacity-50">{pub}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feedback de guardado ── */}
        {saved && (
          <div className="flex items-center gap-2 justify-center text-green-400 text-sm animate-pulse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Guardado correctamente
          </div>
        )}

        {saving && (
          <div className="flex items-center gap-2 justify-center text-text-muted text-sm">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            Guardando...
          </div>
        )}

        {/* ── Nota informativa ── */}
        <p className="text-[11px] text-text-muted text-center leading-relaxed px-2">
          Cambiar a privado no elimina tus contactos actuales. Solo afecta a nuevas personas que intenten contactarte.
        </p>
      </div>
    </div>
  );
};

export default PrivacySettings;