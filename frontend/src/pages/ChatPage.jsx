import { useState } from 'react';
import ServerBar     from '../components/layout/ServerBar';
import Sidebar       from '../components/layout/Sidebar';
import ChatArea      from '../components/chat/ChatArea';
import SettingsModal from '../components/modals/SettingsModal';

const ChatPage = () => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div
      className="w-screen flex flex-row overflow-hidden bg-void"
      style={{ height: '100%', maxHeight: '-webkit-fill-available' }}
    >
      {/* ServerBar — solo PC */}
      <div className="hidden md:flex flex-shrink-0">
        <ServerBar onOpenSettings={() => setShowSettings(true)} />
      </div>

      {/* SIDEBAR */}
      <div
        className={`
          flex-shrink-0 flex-col overflow-hidden
          md:flex md:w-[240px]
          ${selectedConv === null ? 'flex w-full' : 'hidden'}
        `}
      >
        <Sidebar
          selectedConv={selectedConv}
          onSelectConversation={(conv) => setSelectedConv(conv)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* CHAT AREA */}
      <div
        className={`
          flex-col flex-1 overflow-hidden
          md:flex
          ${selectedConv !== null ? 'flex w-full' : 'hidden'}
        `}
      >
        <ChatArea
          conversation={selectedConv}
          onBack={() => setSelectedConv(null)}
        />
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default ChatPage;