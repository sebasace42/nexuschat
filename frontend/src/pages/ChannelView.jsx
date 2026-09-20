import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../components/ui/ToastContext';
import Avatar from '../components/ui/Avatar';
import ChannelPostItem from '../components/channels/ChannelPostItem';

/*
 * Ubicación: src/pages/ChannelView.jsx
 *
 * CÓMO USARLA:
 *   import ChannelView from './pages/ChannelView';
 *   <ChannelView channelId={id} onBack={() => ...} />
 *
 * Muestra el feed del canal. Si el usuario actual es el dueño,
 * aparece un composer abajo para publicar. Si no, solo puede
 * seguir/dejar de seguir y leer.
 */
const ChannelView = ({ channelId, onBack }) => {
  const { user }      = useAuth();
  const { socket }    = useSocket();
  const { showToast } = useToast();

  const [channel, setChannel]   = useState(null);
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [posting, setPosting]   = useState(false);
  const [following, setFollowing] = useState(false);
  const bottomRef = useRef(null);

  const isOwner = channel && user && channel.owner?._id === user._id;

  useEffect(() => {
    if (!channelId) return;
    setLoading(true);

    Promise.all([
      api.get(`/channels/${channelId}`),
      api.get(`/channels/${channelId}/posts`),
    ])
      .then(([chRes, postsRes]) => {
        setChannel(chRes.data);
        setFollowing(chRes.data.followers?.some((f) => (f?._id || f) === user._id));
        setPosts(postsRes.data.posts);
      })
      .catch((err) => {
        console.error('Error cargando canal:', err);
        showToast('No se pudo cargar el canal', 'error');
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  // Unirse a la sala del canal por socket para recibir posts en vivo
  useEffect(() => {
    if (!socket || !channelId) return;
    socket.emit('channels:join', [channelId]);

    const onNewPost = ({ channelId: cId, post }) => {
      if (cId !== channelId) return;
      setPosts((prev) => [...prev, post]);
    };
    const onDeletedPost = ({ channelId: cId, postId }) => {
      if (cId !== channelId) return;
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    };

    socket.on('channel:post:new',     onNewPost);
    socket.on('channel:post:deleted', onDeletedPost);

    return () => {
      socket.off('channel:post:new',     onNewPost);
      socket.off('channel:post:deleted', onDeletedPost);
    };
  }, [socket, channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts.length]);

  const handleToggleFollow = async () => {
    try {
      const { data } = await api.post(`/channels/${channelId}/follow`);
      setFollowing(data.following);
      setChannel((prev) => prev ? { ...prev, followers: new Array(data.followersCount) } : prev);
    } catch (err) {
      console.error('Error siguiendo canal:', err);
      showToast(err?.response?.data?.message || 'No se pudo actualizar', 'error');
    }
  };

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await api.post(`/channels/${channelId}/posts`, { text: text.trim() });
      setText('');
      // El post propio también llega por el socket ('channel:post:new'),
      // así que no lo agregamos dos veces aquí.
    } catch (err) {
      console.error('Error publicando:', err);
      showToast('No se pudo publicar', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/channels/${channelId}/posts/${postId}`);
    } catch (err) {
      console.error('Error eliminando publicación:', err);
      showToast('No se pudo eliminar', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!channel) return null;

  return (
    <div className="flex flex-col h-full bg-void">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-hover transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <Avatar user={{ username: channel.name, avatarColor: channel.avatarColor, avatarUrl: channel.avatarUrl }} size={38} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{channel.name}</p>
          <p className="text-xs text-text-muted truncate">
            {channel.followers?.length || 0} seguidor{channel.followers?.length === 1 ? '' : 'es'}
            {isOwner && ' · Tú administras este canal'}
          </p>
        </div>
        {!isOwner && (
          <button
            onClick={handleToggleFollow}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              following ? 'bg-white/5 text-text-muted hover:bg-white/10' : 'bg-accent text-white hover:bg-accent-bright'
            }`}
          >
            {following ? 'Siguiendo' : 'Seguir'}
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {channel.description && (
          <p className="text-xs text-text-muted text-center mb-2">{channel.description}</p>
        )}

        {posts.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-16">
            {isOwner ? 'Todavía no has publicado nada.' : 'Este canal aún no tiene publicaciones.'}
          </p>
        ) : (
          posts.map((post) => (
            <ChannelPostItem
              key={post._id}
              post={post}
              isOwner={isOwner}
              onDelete={handleDeletePost}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer — solo el dueño puede publicar */}
      {isOwner && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 flex-shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePost(); }}
            placeholder="Escribe una publicación..."
            className="flex-1 bg-input border border-white/10 focus:border-accent rounded-xl px-4 py-2.5 text-sm text-white placeholder-text-muted outline-none transition-colors"
          />
          <button
            onClick={handlePost}
            disabled={!text.trim() || posting}
            className="w-10 h-10 rounded-xl bg-accent hover:bg-accent-bright disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white flex-shrink-0 transition-colors"
          >
            {posting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ChannelView;