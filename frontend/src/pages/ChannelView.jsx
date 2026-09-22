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

  // ── NUEVO: menú "..." y borrado del canal (solo dueño) ──────
  const [showMenu, setShowMenu]                 = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingChannel, setDeletingChannel]   = useState(false);

  // ── NUEVO: cambiar foto del canal ──
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

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

    // Si el canal se elimina (p. ej. desde otra pestaña/dispositivo), salir
    const onChannelDeleted = ({ channelId: cId }) => {
      if (cId !== channelId) return;
      showToast('Este canal fue eliminado', 'info');
      onBack?.();
    };
    socket.on('channel:deleted', onChannelDeleted);

    // Si se actualiza (p. ej. cambio de foto) desde otro lado, reflejarlo
    const onChannelUpdated = ({ channel: updated }) => {
      if (updated._id !== channelId) return;
      setChannel((prev) => (prev ? { ...prev, ...updated } : updated));
    };
    socket.on('channel:updated', onChannelUpdated);

    return () => {
      socket.off('channel:post:new',     onNewPost);
      socket.off('channel:post:deleted', onDeletedPost);
      socket.off('channel:deleted',      onChannelDeleted);
      socket.off('channel:updated',      onChannelUpdated);
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

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo después
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Selecciona una imagen', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const { data } = await api.patch(`/channels/${channelId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setChannel((prev) => (prev ? { ...prev, ...data } : data));
      // El evento 'channel:updated' también actualizará ChannelsListPage
    } catch (err) {
      console.error('Error subiendo la foto del canal:', err);
      showToast(err?.response?.data?.message || 'No se pudo cambiar la foto', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteChannel = async () => {
    setDeletingChannel(true);
    try {
      await api.delete(`/channels/${channelId}`);
      setShowDeleteConfirm(false);
      onBack?.(); // vuelve a la lista de canales
    } catch (err) {
      console.error('Error eliminando canal:', err);
      showToast(err?.response?.data?.message || 'No se pudo eliminar el canal', 'error');
    } finally {
      setDeletingChannel(false);
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
        {isOwner ? (
          <button
            onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
            className="relative flex-shrink-0"
            title="Cambiar foto del canal"
          >
            <Avatar user={{ username: channel.name, avatarColor: channel.avatarColor, avatarUrl: channel.avatarUrl }} size={38} />
            {uploadingAvatar ? (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent border-2 border-void flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </button>
        ) : (
          <Avatar user={{ username: channel.name, avatarColor: channel.avatarColor, avatarUrl: channel.avatarUrl }} size={38} />
        )}
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

        {/* ── NUEVO: menú "..." solo para el dueño ── */}
        {isOwner && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-hover transition-colors"
              title="Más opciones"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
              </svg>
            </button>

            {showMenu && (
              <>
                {/* Overlay invisible para cerrar el menú al hacer clic afuera */}
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-panel border border-white/10 rounded-xl shadow-2xl py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-accent-red hover:bg-hover transition-colors flex items-center gap-2"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Eliminar canal
                  </button>
                </div>
              </>
            )}
          </div>
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

      {/* Modal de confirmación para eliminar el canal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
          <div className="bg-panel border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="px-5 pt-6 pb-4 text-center">
              <div className="w-12 h-12 rounded-full bg-accent-red/10 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97066" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-1">¿Eliminar "{channel.name}"?</h3>
              <p className="text-sm text-text-muted">
                Se borrarán todas las publicaciones y tus seguidores dejarán de verlo. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex border-t border-white/5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingChannel}
                className="flex-1 px-4 py-3.5 text-sm font-medium text-text-secondary hover:bg-hover disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <div className="w-px bg-white/5" />
              <button
                onClick={handleDeleteChannel}
                disabled={deletingChannel}
                className="flex-1 px-4 py-3.5 text-sm font-semibold text-accent-red hover:bg-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {deletingChannel && (
                  <div className="w-3.5 h-3.5 border-2 border-accent-red/30 border-t-accent-red rounded-full animate-spin" />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelView;