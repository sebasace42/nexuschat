import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';

const SettingsModal = ({ onClose }) => {
  const { user, logout } = useAuth();
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-panel border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display text-lg font-bold text-white">Configuración</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <div className="p-6 flex items-center gap-4 border-b border-white/5">
          <Avatar user={user} size={56} />
          <div>
            <p className="font-display font-bold text-white text-lg">{user?.username}</p>
            <p className="text-text-muted text-sm">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-accent-green inline-block" />
              <span className="text-xs text-accent-green font-medium">En línea</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-1">
          {['🔔 Notificaciones','🎨 Apariencia','🔒 Privacidad','❓ Ayuda'].map((item) => (
            <button key={item}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-hover text-text-secondary hover:text-text-primary transition-colors text-sm text-left">
              {item}
            </button>
          ))}
        </div>
        <div className="px-4 pb-4">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-red/10 hover:bg-accent-red/20 text-accent-red font-medium text-sm transition-colors">
            🚪 Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};
export default SettingsModal;