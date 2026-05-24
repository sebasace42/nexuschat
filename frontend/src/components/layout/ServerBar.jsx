import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';

const ServerBar = ({ onOpenSettings }) => {
  const { user, logout } = useAuth();
  return (
    <aside className="w-[68px] bg-void flex flex-col items-center py-3 gap-1 border-r border-white/5 overflow-y-auto flex-shrink-0">
      <SIcon active title="Inicio">🏠</SIcon>
      <div className="w-8 h-px bg-white/10 my-1" />
      <SIcon title="Equipo Dev" color="#5b4fcf">FE</SIcon>
      <SIcon title="Proyecto" color="#1d9e75">🚀</SIcon>
      <SIcon title="Gaming">🎮</SIcon>
      <div className="w-8 h-px bg-white/10 my-1" />
      <button title="Agregar servidor"
        className="w-11 h-11 rounded-2xl border-2 border-dashed border-accent-green/50 flex items-center justify-center text-accent-green hover:bg-accent-green hover:text-white hover:border-solid transition-all text-xl">
        +
      </button>
      <div className="flex-1" />
      <button onClick={onOpenSettings} title="Configuración"
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-text-secondary hover:bg-hover hover:text-text-primary transition-all text-lg">
        ⚙️
      </button>
      <div className="relative group cursor-pointer mt-1" title="Cerrar sesión" onClick={logout}>
        <Avatar user={user} size={36} />
        <div className="absolute inset-0 rounded-full bg-accent-red/0 group-hover:bg-accent-red/80 flex items-center justify-center transition-all">
          <span className="text-white opacity-0 group-hover:opacity-100 text-xs transition-opacity">🚪</span>
        </div>
      </div>
    </aside>
  );
};

const SIcon = ({ children, active, title, color, onClick }) => (
  <button onClick={onClick} title={title}
    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-200 flex-shrink-0
      ${active ? 'bg-accent text-white' : 'bg-deep text-text-secondary hover:bg-accent hover:text-white hover:rounded-3xl'}`}
    style={color ? { background: color, color: 'white' } : {}}>
    {children}
  </button>
);
export default ServerBar;