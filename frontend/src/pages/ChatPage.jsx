import { useState } from 'react';
import ServerBar     from '../components/layout/ServerBar';
import Sidebar       from '../components/layout/Sidebar';
import ChatArea      from '../components/chat/ChatArea';
import SettingsModal from '../components/modals/SettingsModal';

const ChatPage = () => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  return (
    /*
     * h-screen y max-h-screen garantizan que NUNCA
     * se salga de la pantalla. overflow-hidden evita
     * cualquier scroll en el contenedor raíz.
     */
    <div
      style={{ height: '100dvh' }}
      className="w-screen flex flex-row overflow-hidden bg-void"
    >

      {/* ServerBar — solo PC */}
      <div className="hidden md:flex flex-shrink-0">
        <ServerBar onOpenSettings={() => setShowSettings(true)} />
      </div>

      {/*
       * SIDEBAR
       * Sin chat → móvil: flex w-full | PC: md:flex md:w-[240px]
       * Con chat → móvil: hidden      | PC: md:flex md:w-[240px]
       */}
      <div
        className={`
          flex-shrink-0 flex-col overflow-hidden
          md:flex md:w-[240px]
          ${selectedConv === null
            ? 'flex w-full'
            : 'hidden'
          }
        `}
      >
        <Sidebar
          selectedConv={selectedConv}
          onSelectConversation={(conv) => setSelectedConv(conv)}
        />
      </div>

      {/*
       * CHAT AREA
       * Sin chat → móvil: hidden      | PC: md:flex
       * Con chat → móvil: flex w-full | PC: md:flex
       * flex-1 hace que ocupe todo el espacio restante en PC
       */}
      <div
        className={`
          flex-col flex-1 overflow-hidden
          md:flex
          ${selectedConv !== null
            ? 'flex w-full'
            : 'hidden'
          }
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