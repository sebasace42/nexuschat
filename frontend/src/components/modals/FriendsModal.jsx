import { useState, useEffect, useRef } from 'react';
import api         from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../ui/Avatar';

const TABS = [
  { id: 'friends',  label: 'Contactos',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'requests', label: 'Solicitudes',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> },
  { id: 'search',   label: 'Añadir',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
];

const Btn = ({ onClick, color = 'accent', children, disabled }) => {
  const colors = {
    accent: 'bg-accent hover:bg-accent-bright text-white',
    red:    'bg-red-600/20 hover:bg-red-600/30 text-red-400',
    gray:   'bg-white/5 hover:bg-white/10 text-text-secondary',
    green:  'bg-green-600/20 hover:bg-green-600/30 text-green-400',
    amber:  'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 whitespace-nowrap ${colors[color]}`}
    >
      {children}
    </button>
  );
};

// Ícono candado mini
const Lock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted inline-block ml-1 flex-shrink-0">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const UserRow = ({ user: u, sub, right }) => (
  <div className="flex items-center gap-3 w-full">
    <div className="flex-shrink-0">
      <Avatar user={u} size={42} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center">
        <p className="text-sm font-semibold text-white truncate">{u.username}</p>
        {u.isPrivate && <Lock />}
      </div>
      {sub && <p className="text-xs text-text-muted mt-0.5 truncate">{sub}</p>}
    </div>
    {right && <div className="flex-shrink-0 flex gap-1.5 ml-2">{right}</div>}
  </div>
);

const FriendsModal = ({ onClose, onStartChat }) => {
  const { user }   = useAuth();
  const { socket } = useSocket();
  const [tab,      setTab]      = useState('friends');
  const [friends,  setFriends]  = useState([]);
  const [requests, setRequests] = useState([]);
  const [search,   setSearch]   = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [pending,  setPending]  = useState(new Set());
  const searchRef = useRef(null);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  // Socket: eventos en tiempo real
  useEffect(() => {
    if (!socket) return;

    const onRequest = ({ friendship }) => {
      setRequests((prev) =>
        prev.some((r) => r._id === friendship._id) ? prev : [friendship, ...prev]
      );
    };

    const onAccepted = ({ friendship }) => {
      const friend =
        friendship.requester._id === user?._id
          ? friendship.recipient
          : friendship.requester;
      setFriends((prev) =>
        prev.some((f) => f._id === friend._id) ? prev : [friend, ...prev]
      );
      setRequests((prev) => prev.filter((r) => r._id !== friendship._id));
      setResults((prev) =>
        prev.map((r) => r._id === friend._id ? { ...r, friendStatus: 'accepted' } : r)
      );
    };

    const onRemoved = ({ userId }) => {
      setFriends((prev) => prev.filter((f) => f._id !== userId?.toString()));
    };

    socket.on('friend:request',  onRequest);
    socket.on('friend:accepted', onAccepted);
    socket.on('friend:removed',  onRemoved);
    return () => {
      socket.off('friend:request',  onRequest);
      socket.off('friend:accepted', onAccepted);
      socket.off('friend:removed',  onRemoved);
    };
  }, [socket, user]);

  // Búsqueda con debounce
  useEffect(() => {
    clearTimeout(searchRef.current);
    if (search.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    searchRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/friends/search?q=${encodeURIComponent(search.trim())}`);
        setResults(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(searchRef.current);
  }, [search]);

  const fetchFriends  = async () => {
    try { const { data } = await api.get('/friends');          setFriends(data);  } catch {}
  };
  const fetchRequests = async () => {
    try { const { data } = await api.get('/friends/requests'); setRequests(data); } catch {}
  };

  const withPending = (key, fn) => async () => {
    setPending((s) => new Set(s).add(key));
    try { await fn(); }
    finally { setPending((s) => { const n = new Set(s); n.delete(key); return n; }); }
  };

  // Enviar solicitud — detecta si fue auto-aceptada (perfil público)
  const sendRequest = (u) => withPending(`send_${u._id}`, async () => {
    try {
      const { data } = await api.post('/friends/request', { recipientId: u._id });
      if (data.autoAccepted) {
        // Perfil público → contactos de inmediato
        setResults((prev) =>
          prev.map((r) => r._id === u._id ? { ...r, friendStatus: 'accepted' } : r)
        );
        const friend = data.friendship.requester._id === user?._id
          ? data.friendship.recipient
          : data.friendship.requester;
        setFriends((prev) =>
          prev.some((f) => f._id === friend._id) ? prev : [friend, ...prev]
        );
      } else {
        // Perfil privado → solicitud pendiente
        setResults((prev) =>
          prev.map((r) => r._id === u._id ? { ...r, friendStatus: 'pending_sent' } : r)
        );
      }
    } catch (err) { console.error(err); }
  })();

  const acceptRequest = (friendshipId, requester) => withPending(`accept_${friendshipId}`, async () => {
    await api.post(`/friends/accept/${friendshipId}`);
    setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
    setFriends((prev) =>
      prev.some((f) => f._id === requester._id) ? prev : [requester, ...prev]
    );
  })();

  const rejectRequest = (friendshipId) => withPending(`reject_${friendshipId}`, async () => {
    await api.post(`/friends/reject/${friendshipId}`);
    setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
  })();

  const removeFriend = (friendId) => withPending(`remove_${friendId}`, async () => {
    await api.delete(`/friends/${friendId}`);
    setFriends((prev) => prev.filter((f) => f._id !== friendId));
  })();

  const startChat = async (friendId) => {
    try {
      const { data } = await api.post('/conversations', { recipientId: friendId });
      onStartChat(data);
      onClose();
    } catch (err) { console.error(err); }
  };

  const pendingCount = requests.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-panel border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <h2 className="font-display text-lg font-bold text-white">Contactos</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/5 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors relative ${
                tab === t.id
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === 'requests' && pendingCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Contactos ── */}
          {tab === 'friends' && (
            friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <p className="text-white text-sm font-semibold">Sin contactos aún</p>
                <p className="text-text-muted text-xs">Ve a "Añadir" para buscar personas.</p>
                <button onClick={() => setTab('search')} className="mt-1 px-4 py-2 rounded-full bg-accent text-white text-xs font-semibold hover:opacity-90">
                  Buscar personas
                </button>
              </div>
            ) : (
              <div className="py-2">
                {friends.map((f) => (
                  <div key={f._id} className="px-4 py-3 hover:bg-white/3 transition-colors">
                    <UserRow
                      user={f}
                      sub="Contacto"
                      right={<>
                        <Btn onClick={() => startChat(f._id)}>Mensaje</Btn>
                        <Btn onClick={() => removeFriend(f._id)} color="red" disabled={pending.has(`remove_${f._id}`)}>
                          {pending.has(`remove_${f._id}`) ? '...' : 'Eliminar'}
                        </Btn>
                      </>}
                    />
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Solicitudes recibidas ── */}
          {tab === 'requests' && (
            requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-2">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                    <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
                  </svg>
                </div>
                <p className="text-white text-sm font-semibold">Sin solicitudes pendientes</p>
                <p className="text-text-muted text-xs">Cuando alguien te envíe una solicitud aparecerá aquí.</p>
              </div>
            ) : (
              <div className="py-2">
                {requests.map((req) => (
                  <div key={req._id} className="px-4 py-3 hover:bg-white/3 transition-colors">
                    <UserRow
                      user={req.requester}
                      sub="Quiere ser tu contacto"
                      right={<>
                        <Btn onClick={() => acceptRequest(req._id, req.requester)} color="green" disabled={pending.has(`accept_${req._id}`)}>
                          {pending.has(`accept_${req._id}`) ? '...' : 'Aceptar'}
                        </Btn>
                        <Btn onClick={() => rejectRequest(req._id)} color="red" disabled={pending.has(`reject_${req._id}`)}>
                          {pending.has(`reject_${req._id}`) ? '...' : 'Rechazar'}
                        </Btn>
                      </>}
                    />
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Buscar / Añadir ── */}
          {tab === 'search' && (
            <div>
              <div className="px-4 pt-4 pb-2">
                <label className="flex items-center gap-2 bg-input border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-accent transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted flex-shrink-0">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre de usuario..."
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-white placeholder-text-muted outline-none"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-text-muted hover:text-white transition-colors">✕</button>
                  )}
                </label>
                <p className="text-xs text-text-muted mt-2 px-1">Escribe al menos 2 caracteres para buscar</p>
              </div>

              {loading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              )}

              {!loading && search.trim().length >= 2 && results.length === 0 && (
                <p className="text-center py-10 text-text-muted text-sm">No se encontraron usuarios</p>
              )}

              {!loading && results.length > 0 && (
                <div className="py-2">
                  {results.map((u) => {
                    const isSelf = u._id === user?._id;
                    const { friendStatus, isPrivate } = u;

                    const sub =
                      isSelf                              ? 'Eres tú'
                      : friendStatus === 'accepted'       ? '✓ Contacto'
                      : friendStatus === 'pending_sent'   ? (isPrivate ? '⏳ Solicitud enviada' : '⏳ Pendiente')
                      : friendStatus === 'pending_received'? 'Te envió solicitud'
                      : isPrivate                         ? '🔒 Cuenta privada'
                      : '🌐 Cuenta pública';

                    const actionBtn = isSelf ? null
                      : friendStatus === 'accepted' ? (
                          <Btn onClick={() => startChat(u._id)} color="gray">Mensaje</Btn>
                        )
                      : friendStatus === 'pending_sent' ? (
                          <span className="text-xs text-text-muted px-2">Pendiente</span>
                        )
                      : friendStatus === 'pending_received' ? (
                          <Btn onClick={() => setTab('requests')} color="green">Ver</Btn>
                        )
                      : isPrivate ? (
                          <Btn
                            onClick={() => sendRequest(u)}
                            color="amber"
                            disabled={pending.has(`send_${u._id}`)}
                          >
                            {pending.has(`send_${u._id}`) ? '...' : '🔒 Solicitar'}
                          </Btn>
                        ) : (
                          <Btn
                            onClick={() => sendRequest(u)}
                            disabled={pending.has(`send_${u._id}`)}
                          >
                            {pending.has(`send_${u._id}`) ? '...' : '+ Añadir'}
                          </Btn>
                        );

                    return (
                      <div key={u._id} className="px-4 py-3 hover:bg-white/3 transition-colors">
                        <UserRow user={u} sub={sub} right={actionBtn} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsModal;