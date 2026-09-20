import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/ToastContext';
import StarredMessagesModal from '../components/modals/StarredMessagesModal';

/*
 * Ubicación: src/pages/StarredMessagesPage.jsx
 * (junto a ChatPage.jsx, mismo patrón)
 */

/*
 * StarredMessagesPage — Vista global de "Mensajes destacados"
 * (como el ícono de estrella en la lista de chats de WhatsApp).
 *
 * CÓMO USARLA:
 * Es un wrapper que carga los destacados de TODAS tus conversaciones
 * y los muestra con StarredMessagesModal (showChatName=true).
 *
 *   import StarredMessagesPage from './StarredMessagesPage';
 *   const [showStarred, setShowStarred] = useState(false);
 *   ...
 *   <button onClick={() => setShowStarred(true)}>⭐ Destacados</button>
 *   {showStarred && <StarredMessagesPage onClose={() => setShowStarred(false)} />}
 *
 * No necesita más props — se encarga de cargar y refrescar su propia lista.
 */
const StarredMessagesPage = ({ onClose }) => {
  const { user }       = useAuth();
  const { showToast }  = useToast();
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/conversations/starred/messages')
      .then(({ data }) => setMessages(data))
      .catch((err) => {
        console.error('Error cargando destacados:', err);
        showToast('No se pudieron cargar los mensajes destacados', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleUnstar = async (messageId, conversationId) => {
    try {
      const { data } = await api.post(
        `/conversations/${conversationId}/messages/${messageId}/star`
      );
      if (!data.starred) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch (err) {
      console.error('Error quitando destacado:', err);
      showToast('No se pudo quitar de destacados', 'error');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <StarredMessagesModal
      messages={messages}
      currentUserId={user._id}
      onClose={onClose}
      onUnstar={handleUnstar}
      showChatName
      title="Mensajes destacados"
    />
  );
};

export default StarredMessagesPage;