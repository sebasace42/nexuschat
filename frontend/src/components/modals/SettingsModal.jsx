import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import api from '../../api/axios';

const AVATAR_COLORS = [
  '#5b4fcf', '#1d9e75', '#d85a30',
  '#d4537e', '#378add', '#ba7517', '#639922',
];

const SettingsModal = ({ onClose }) => {
  const { user, updateUser, logout } = useAuth();

  const [view, setView]         = useState('main');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio]           = useState(user?.bio ?? '');
  const [color, setColor]       = useState(user?.avatarColor ?? AVATAR_COLORS[0]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

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

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-panel border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          {view === 'edit' ? (
            <button onClick={goBack} className="text-text-muted hover:text-text-primary transition-colors text-sm">
              ← Volver
            </button>
          ) : (
            <h2 className="font-display text-lg font-bold text-white">Configuración</h2>
          )}
          {view === 'edit' && (
            <h2 className="font-display text-base font-bold text-white">Editar perfil</h2>
          )}
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">✕</button>
        </div>

        {/* ── VISTA PRINCIPAL ── */}
        {view === 'main' && (
          <>
            {/* Perfil */}
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

            {/* Opciones */}
            <div className="p-4 space-y-1">
              <button
                onClick={() => setView('edit')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-hover text-text-secondary hover:text-text-primary transition-colors text-sm text-left"
              >
                ✏️ Editar perfil
              </button>
              {['🔔 Notificaciones', '🔒 Privacidad', '❓ Ayuda'].map((item) => (
                <button key={item}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-hover text-text-secondary hover:text-text-primary transition-colors text-sm text-left">
                  {item}
                </button>
              ))}
            </div>

            {/* Cerrar sesión */}
            <div className="px-4 pb-4">
              <button onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-red/10 hover:bg-accent-red/20 text-accent-red font-medium text-sm transition-colors">
                🚪 Cerrar sesión
              </button>
            </div>
          </>
        )}

        {/* ── VISTA EDITAR PERFIL ── */}
        {view === 'edit' && (
          <>
            {/* Preview avatar + selector color */}
            <div className="p-6 flex flex-col items-center gap-4 border-b border-white/5">
              <Avatar user={{ ...user, username, avatarColor: color }} size={72} />
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`
                      w-7 h-7 rounded-full transition-transform
                      ${color === c
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-panel scale-110'
                        : 'hover:scale-105'}
                    `}
                  />
                ))}
              </div>
            </div>

            {/* Formulario */}
            <div className="p-6 space-y-4">

              {/* Nombre */}
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider mb-1.5 block">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="w-full bg-input border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent placeholder-text-muted transition-colors"
                  placeholder="Tu nombre..."
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider mb-1.5 block">
                  Bio <span className="normal-case text-text-muted/60">(opcional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={100}
                  rows={2}
                  className="w-full bg-input border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:border-accent placeholder-text-muted transition-colors"
                  placeholder="Cuéntanos algo..."
                />
                <p className="text-right text-[10px] text-text-muted mt-1">{bio.length}/100</p>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-accent-red bg-accent-red/10 px-3 py-2 rounded-lg">{error}</p>
              )}

              {/* Éxito */}
              {success && (
                <p className="text-xs text-accent-green bg-accent-green/10 px-3 py-2 rounded-lg">✓ Perfil actualizado</p>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={goBack}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-secondary text-sm hover:bg-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default SettingsModal;
