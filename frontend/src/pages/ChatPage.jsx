import { useState } from 'react';
import ServerBar     from '../components/layout/ServerBar';
import Sidebar       from '../components/layout/Sidebar';
import ChatArea      from '../components/chat/ChatArea';
import SettingsModal from '../components/modals/SettingsModal';
import ChannelsListPage from './ChannelsListPage';
import ChannelView      from './ChannelView';

const ChatPage = () => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // ── NUEVO: canales de difusión ──────────────────────────────
  const [showChannels, setShowChannels]       = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState(null);

  const openChannels = () => {
    setSelectedConv(null);      // salir del chat activo si había uno
    setSelectedChannelId(null);
    setShowChannels(true);
  };

  const closeChannels = () => {
    setShowChannels(false);
    setSelectedChannelId(null);
  };

  return (
    <div
      className="w-screen flex flex-row overflow-hidden bg-void"
      style={{ height: '100%', maxHeight: '-webkit-fill-available' }}
    >
      {/* ServerBar — solo PC */}
      <div className="hidden md:flex flex-shrink-0">
        <ServerBar onOpenSettings={() => setShowSettings(true)} onOpenChannels={openChannels} />
      </div>

      {/* SIDEBAR / LISTA DE CANALES */}
      <div
        className={`
          flex-shrink-0 flex-col overflow-hidden
          md:flex md:w-[240px]
          ${(selectedConv === null && selectedChannelId === null) ? 'flex w-full' : 'hidden'}
        `}
      >
        {showChannels ? (
          <ChannelsListPage
            onOpenChannel={(id) => setSelectedChannelId(id)}
            onBack={closeChannels}
          />
        ) : (
          <Sidebar
            selectedConv={selectedConv}
            onSelectConversation={(conv) => setSelectedConv(conv)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenChannels={openChannels}
          />
        )}
      </div>

      {/* CHAT AREA / VISTA DE CANAL */}
      <div
        className={`
          flex-col flex-1 overflow-hidden
          md:flex
          ${(selectedConv !== null || selectedChannelId !== null) ? 'flex w-full' : 'hidden'}
        `}
      >
        {showChannels ? (
          selectedChannelId && (
            <ChannelView
              channelId={selectedChannelId}
              onBack={() => setSelectedChannelId(null)}
            />
          )
        ) : (
          <ChatArea
            conversation={selectedConv}
            onBack={() => setSelectedConv(null)}
          />
        )}
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default ChatPage;