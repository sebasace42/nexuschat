import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../components/ui/ToastContext';
import Avatar from '../components/ui/Avatar';
import CreateChannelModal from '../components/modals/CreateChannelModal';

/*
 * Ubicación: src/pages/ChannelsListPage.jsx
 *
 * Lista de canales: pestaña "Mis canales" (los que sigues o eres
 * dueño) y "Descubrir" (todos los canales públicos, con buscador).
 *
 * CÓMO USARLA:
 *   import ChannelsListPage from './pages/ChannelsListPage';
 *   <ChannelsListPage onOpenChannel={(channelId) => ...navegar... } />
 *
 * onOpenChannel(channelId) — llámalo tú para navegar a ChannelView
 * con el id del canal (con tu router o con estado, como prefieras).
 */
const ChannelsListPage = ({ onOpenChannel }) => {
  const { showToast } = useToast();
  const [tab, setTab]           = useState('mine'); // 'mine' | 'discover'
  const [mine, setMine]         = useState([]);
  const [discover, setDiscover] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [followingIds, setFollowingIds] = useState(new Set());

  const loadDiscover = (q = '') => {
    api.get('/channels', { params: q ? { search: q } : {} })
      .then(({ data }) => setDiscover(data))
      .catch((err) => console.error('Error cargando canales:', err));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/channels/mine'),
      api.get('/channels'),
    ])
      .then(([mineRes, discRes]) => {
        setMine(mineRes.data);
        setFollowingIds(new Set(mineRes.data.map((c) => c._id)));
        setDiscover(discRes.data);
      })
      .catch((err) => {
        console.error('Error cargando canales:', err);
        showToast('No se pudieron cargar los canales', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab === 'discover') loadDiscover(search);
    }, 350);
    return () => clearTimeout(t);
  }, [search, tab]);

  const handleCreate = async ({ name, description, avatarColor }) => {
    setCreating(true);
    try {
      const { data } = await api.post('/channels', { name, description, avatarColor });
      setMine((prev) => [data, ...prev]);
      setFollowingIds((prev) => new Set(prev).add(data._id));
      setShowCreate(false);
      onOpenChannel?.(data._id);
    } catch (err) {
      console.error('Error creando canal:', err);
      showToast('No se pudo crear el canal', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleFollow = async (channel, e) => {
    e.stopPropagation();
    try {
      const { data } = await api.post(`/channels/${channel._id}/follow`);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (data.following) next.add(channel._id); else next.delete(channel._id);
        return next;
      });
      if (data.following) {
        setMine((prev) => [channel, ...prev.filter((c) => c._id !== channel._id)]);
      } else {
        setMine((prev) => prev.filter((c) => c._id !== channel._id));
      }
    } catch (err) {
      console.error('Error siguiendo canal:', err);
      showToast('No se pudo actualizar. Intenta de nuevo', 'error');
    }
  };

  const list = tab === 'mine' ? mine : discover;

  return (
    <div className="flex flex-col h-full bg-void">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold text-white">Canales</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="w-9 h-9 rounded-xl bg-accent hover:bg-accent-bright flex items-center justify-center text-white transition-colors"
          title="Crear canal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 py-3 flex-shrink-0">
        {[
          { id: 'mine',     label: 'Mis canales' },
          { id: 'discover', label: 'Descubrir'    },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent text-white' : 'bg-white/5 text-text-muted hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <div className="px-5 pb-3 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canales..."
            className="w-full bg-input border border-white/10 focus:border-accent rounded-xl px-4 py-2.5 text-sm text-white placeholder-text-muted outline-none transition-colors"
          />
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-16 px-6">
            {tab === 'mine'
              ? 'Todavía no sigues ningún canal. Ve a "Descubrir" o crea el tuyo.'
              : 'No se encontraron canales.'}
          </p>
        ) : (
          list.map((channel) => {
            const isFollowing = followingIds.has(channel._id);

            return (
              <div
                key={channel._id}
                onClick={() => onOpenChannel?.(channel._id)}
                className="w-full flex items-center gap-3 px-2 py-3 rounded-2xl hover:bg-hover transition-colors text-left cursor-pointer"
              >
                <Avatar
                  user={{ username: channel.name, avatarColor: channel.avatarColor, avatarUrl: channel.avatarUrl }}
                  size={44}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{channel.name}</p>
                  <p className="text-xs text-text-muted truncate">
                    {channel.followers?.length || 0} seguidor{channel.followers?.length === 1 ? '' : 'es'}
                    {channel.description ? ` · ${channel.description}` : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => handleToggleFollow(channel, e)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    isFollowing
                      ? 'bg-white/5 text-text-muted hover:bg-white/10'
                      : 'bg-accent text-white hover:bg-accent-bright'
                  }`}
                >
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {showCreate && (
        <CreateChannelModal
          creating={creating}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
};

export default ChannelsListPage;