import { useState } from 'react';
import ServerBar     from '../components/layout/ServerBar';
import Sidebar       from '../components/layout/Sidebar';
import ChatArea      from '../components/chat/ChatArea';
import SettingsModal from '../components/modals/SettingsModal';

const ChatPage = () => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleSelectConv = (conv) => setSelectedConv(conv);
  const handleBack       = () => setSelectedConv(null);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-void">

      {/* ── ServerBar: oculto en móvil ── */}
      <div className="hidden md:flex flex-shrink-0">
        <ServerBar onOpenSettings={() => setShowSettings(true)} />
      </div>

      {/* ── Sidebar: pantalla completa en móvil cuando NO hay chat ── */}
      <div className={`
        flex-shrink-0 flex flex-col
        ${selectedConv
          ? 'hidden md:flex'          // móvil: oculto si hay chat abierto
          : 'flex w-full md:w-[240px]' // móvil: pantalla completa
        }
        md:w-[240px]
      `}>
        <Sidebar
          selectedConv={selectedConv}
          onSelectConversation={handleSelectConv}
        />
      </div>

      {/* ── ChatArea: pantalla completa en móvil cuando HAY chat ── */}
      <div className={`
        flex-col flex-1 overflow-hidden
        ${selectedConv ? 'flex' : 'hidden md:flex'}
      `}>
        <ChatArea
          conversation={selectedConv}
          onBack={handleBack}
        />
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default ChatPage;