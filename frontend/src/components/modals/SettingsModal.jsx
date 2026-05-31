import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import api from '../../api/axios';

const AVATAR_COLORS = [
  '#5b4fcf', '#1d9e75', '#d85a30',
  '#d4537e', '#378add', '#ba7517', '#639922',
];

// ── Toggle switch reutilizable ────────────────────────────────────
const Toggle = ({ enabled, onChange, label, description }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <div className="flex-1 min-w-0 pr-4">
      <p className="text-sm text-text-primary">{label}</p>
      {description && (
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      )}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`
        relative w-11 h-6 rounded-full transition-colors flex-shrink-0
        ${enabled ? 'bg-accent' : 'bg-white/15'}
      `}
    >
      <span className={`
        absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white
        shadow transition-transform duration-200
        ${enabled ? 'translate-x-5' : 'translate-x-0'}
      `} />
    </button>
  </div>
);

const SettingsModal = ({ onClose }) => {
  const { user, updateUser, logout } = useAuth();

  // ── Vista activa ──────────────────────────────────────────────
  const [view, setView] = useState('main');

  // ── Editar perfil ─────────────────────────────────────────────
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio]           = useState(user?.bio ?? '');
  const [color, setColor]       = useState(user?.avatarColor ?? AVATAR_COLORS[0]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  // ── Notificaciones (guardadas en localStorage) ────────────────
  const [notifMessages,  setNotifMessages]  = useState(() =>
    localStorage.getItem('notif_messages') !== 'false'
  );
  const [notifSounds,    setNotifSounds]    = useState(() =>
    localStorage.getItem('notif_sounds') !== 'false'
  );
  const [notifPreview,   setNotifPreview]   = useState(() =>
    localStorage.getItem('notif_preview') !== 'false'
  );

  useEffect(() => {
    localStorage.setItem('notif_messages', notifMessages);
  }, [notifMessages]);
  useEffect(() => {
    localStorage.setItem('notif_sounds', notifSounds);
  }, [notifSounds]);
  useEffect(() => {
    localStorage.setItem('notif_preview', notifPreview);
  }, [notifPreview]);

  // ── Privacidad ────────────────────────────────────────────────
  const [hideOnline,    setHideOnline]    = useState(user?.hideOnline    ?? false);
  const [hideLastSeen,  setHideLastSeen]  = useState(user?.hideLastSeen  ?? false);
  const [hideReadReceipt, setHideReadReceipt] = useState(user?.hideReadReceipt ?? false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySaved,  setPrivacySaved]  = useState(false);

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      const { data } = await api.put('/users/profile', {
        username: user.username,
        bio:      user.bio ?? '',
        avatarColor: user.avatarColor,
        hideOnline,
        hideLastSeen,
        hideReadReceipt,
      });
      updateUser(data);
      setPrivacySaved(true);
      setTimeout(() => setPrivacySaved(false), 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPrivacy(false);
    }
  };

  // ── Editar perfil: guardar ────────────────────────────────────
  const handleSave = async () => {
    if (!username.trim())           return setError('El nombre no puede estar vacío');
    if (username.trim().length < 3) return setError('Mínimo 3 caracteres');
    setError('');
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', {
        username:    username.trim(),
        bio:         bio.trim(),
        avatarColor: color,
      });
      updateUser(data);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setView('main'); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => { setView('main'); setError(''); };

  // ── Títulos del header por vista ──────────────────────────────
  const titles = {
    main:          'Configuración',
    edit:          'Editar perfil',
    notifications: 'Notificaciones',
    privacy:       'Privacidad',
    help:          'Ayuda',
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-panel border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          {view !== 'main' ? (
            <button onClick={goBack} className="text-text-muted hover:text-text-primary transition-colors text-sm">
              ← Volver
            </button>
          ) : (
            <h2 className="font-display text-lg font-bold text-white">{titles[view]}</h2>
          )}
          {view !== 'main' && (
            <h2 className="font-display text-base font-bold text-white">{titles[view]}</h2>
          )}
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">✕</button>
        </div>

        {/* ── CONTENIDO SCROLLEABLE ── */}
        <div className="overflow-y-auto flex-1">

          {/* ════ VISTA PRINCIPAL ════ */}
          {view === 'main' && (
            <>
              <div className="p-6 flex items-center gap-4 border-b border-white/5">
                <Avatar user={user} size={56} />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-white text-lg truncate">{user?.username}</p>
                  <p className="text-text-muted text-sm truncate">{user?.email}</p>
                  {user?.bio && (
                    <p className="text-text-secondary text-xs mt-0.5 truncate">{user.bio}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-accent-green inline-block" />
                    <span className="text-xs text-accent-green font-medium">En línea</span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-1">
                {[
                  { id: 'edit',          label: '✏️ Editar perfil' },
                  { id: 'notifications', label: '🔔 Notificaciones' },
                  { id: 'privacy',       label: '🔒 Privacidad' },
                  { id: 'help',          label: '❓ Ayuda' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl hover:bg-hover text-text-secondary hover:text-text-primary transition-colors text-sm text-left"
                  >
                    <span>{label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-40">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                ))}
              </div>

              <div className="px-4 pb-4">
                <button onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-red/10 hover:bg-accent-red/20 text-accent-red font-medium text-sm transition-colors">
                  🚪 Cerrar sesión
                </button>
              </div>
            </>
          )}

          {/* ════ VISTA EDITAR PERFIL ════ */}
          {view === 'edit' && (
            <>
              <div className="p-6 flex flex-col items-center gap-4 border-b border-white/5">
                <Avatar user={{ ...user, username, avatarColor: color }} size={72} />
                <div className="flex gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-panel scale-110' : 'hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider mb-1.5 block">Nombre de usuario</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30}
                    className="w-full bg-input border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent placeholder-text-muted transition-colors"
                    placeholder="Tu nombre..." />
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider mb-1.5 block">Bio <span className="normal-case text-text-muted/60">(opcional)</span></label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={100} rows={2}
                    className="w-full bg-input border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:border-accent placeholder-text-muted transition-colors"
                    placeholder="Cuéntanos algo..." />
                  <p className="text-right text-[10px] text-text-muted mt-1">{bio.length}/100</p>
                </div>
                {error   && <p className="text-xs text-accent-red bg-accent-red/10 px-3 py-2 rounded-lg">{error}</p>}
                {success && <p className="text-xs text-accent-green bg-accent-green/10 px-3 py-2 rounded-lg">✓ Perfil actualizado</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={goBack} className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-secondary text-sm hover:bg-hover transition-colors">Cancelar</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ════ VISTA NOTIFICACIONES ════ */}
          {view === 'notifications' && (
            <div className="p-6">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-4">Mensajes</p>
              <Toggle
                enabled={notifMessages}
                onChange={setNotifMessages}
                label="Notificaciones de mensajes"
                description="Recibir alertas cuando llegue un mensaje nuevo"
              />
              <Toggle
                enabled={notifSounds}
                onChange={setNotifSounds}
                label="Sonidos"
                description="Reproducir sonido al recibir un mensaje"
              />
              <Toggle
                enabled={notifPreview}
                onChange={setNotifPreview}
                label="Vista previa del mensaje"
                description="Mostrar el texto del mensaje en la notificación"
              />

              <div className="mt-6 bg-white/5 rounded-xl p-4">
                <p className="text-xs text-text-muted leading-relaxed">
                  💡 Para que las notificaciones funcionen en tu dispositivo, asegúrate de tener los permisos activados en la configuración de tu navegador.
                </p>
              </div>
            </div>
          )}

          {/* ════ VISTA PRIVACIDAD ════ */}
          {view === 'privacy' && (
            <div className="p-6">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-4">Visibilidad</p>
              <Toggle
                enabled={hideOnline}
                onChange={setHideOnline}
                label="Ocultar estado en línea"
                description="Los demás no verán si estás conectado"
              />
              <Toggle
                enabled={hideLastSeen}
                onChange={setHideLastSeen}
                label="Ocultar última vez visto"
                description="Los demás no verán cuándo fue tu última conexión"
              />
              <Toggle
                enabled={hideReadReceipt}
                onChange={setHideReadReceipt}
                label="Ocultar confirmación de lectura"
                description="Los demás no verán cuando lees sus mensajes"
              />

              <p className="text-xs text-text-muted uppercase tracking-wider mt-6 mb-4">Próximamente</p>
              {['Bloquear usuarios', 'Mensajes temporales', 'Modo invisible'].map((item) => (
                <div key={item} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 opacity-40">
                  <p className="text-sm text-text-primary">{item}</p>
                  <span className="text-[10px] bg-white/10 text-text-muted px-2 py-0.5 rounded-full">Pronto</span>
                </div>
              ))}

              {privacySaved && (
                <p className="text-xs text-accent-green bg-accent-green/10 px-3 py-2 rounded-lg mt-4">✓ Privacidad actualizada</p>
              )}

              <button
                onClick={handleSavePrivacy}
                disabled={savingPrivacy}
                className="w-full mt-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {savingPrivacy ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* ════ VISTA AYUDA ════ */}
          {view === 'help' && (
            <div className="p-6 space-y-4">

              {/* Info de la app */}
              <div className="flex flex-col items-center py-4 border-b border-white/5">
                <p className="font-display text-2xl font-extrabold text-white">
                  Nexus<span className="text-accent">Chat</span>
                </p>
                <p className="text-xs text-text-muted mt-1">Versión 1.0.2</p>
                <p className="text-xs text-text-secondary mt-2 text-center">
                  Mensajería instantánea en tiempo real, rápida y segura.
                </p>
              </div>

              {/* FAQ */}
              {[
                {
                  q: '¿Cómo envío una imagen?',
                  a: 'Toca el ícono 🖼️ en el input de mensaje, selecciona la imagen y pulsa enviar.',
                },
                {
                  q: '¿Qué significa el doble check azul?',
                  a: '✓ gris = enviado. ✓✓ gris = entregado al dispositivo. ✓✓ azul = leído por el receptor.',
                },
                {
                  q: '¿Cómo inicio un nuevo chat?',
                  a: 'Toca el botón + en la parte superior de la lista de conversaciones y busca al usuario por nombre.',
                },
                {
                  q: '¿Puedo usar NexusChat en PC y celular?',
                  a: 'Sí, NexusChat funciona en cualquier navegador, tanto en móvil como en escritorio.',
                },
                {
                  q: '¿Cómo elimino un mensaje?',
                  a: 'Mantén presionado el mensaje (móvil) o pasa el cursor por encima (PC) y toca el ícono de papelera.',
                },
                {
                  q: '¿Cómo cambio mi foto de perfil?',
                  a: 'Ve a Configuración → Editar perfil y selecciona un color de avatar.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm font-medium text-white mb-1">{q}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{a}</p>
                </div>
              ))}

              {/* Footer */}
              <div className="text-center pt-2 pb-1">
                <p className="text-xs text-text-muted">Hecho con ❤️ · NexusChat © 2026</p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
