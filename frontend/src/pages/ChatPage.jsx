import { useState } from 'react';
import ServerBar     from '../components/layout/ServerBar';
import Sidebar       from '../components/layout/Sidebar';
import ChatArea      from '../components/chat/ChatArea';
import SettingsModal from '../components/modals/SettingsModal';

const ChatPage = () => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // En móvil: si hay conversación seleccionada, mostrar solo el chat
  // Si no, mostrar solo el sidebar
  const handleSelectConv = (conv) => setSelectedConv(conv);
  const handleBack = () => setSelectedConv(null);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-void">

      {/* ServerBar — oculto en móvil */}
      <div className="hidden md:flex">
        <ServerBar onOpenSettings={() => setShowSettings(true)} />
      </div>

      {/* Sidebar — en móvil ocupa toda la pantalla cuando no hay chat seleccionado */}
      <div className={`
        ${selectedConv ? 'hidden md:flex' : 'flex'}
        w-full md:w-[240px]
      `}>
        <Sidebar
          selectedConv={selectedConv}
          onSelectConversation={handleSelectConv}
        />
      </div>

      {/* ChatArea — en móvil ocupa toda la pantalla cuando hay chat seleccionado */}
      <div className={`
        ${selectedConv ? 'flex' : 'hidden md:flex'}
        flex-1 flex-col overflow-hidden
      `}>
        {/* Botón volver en móvil */}
        {selectedConv && (
          <div className="flex md:hidden items-center gap-2 px-3 py-2 bg-panel border-b border-white/5 flex-shrink-0">
            <button
              onClick={handleBack}
              className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-hover transition-colors"
            >
              ← Volver
            </button>
          </div>
        )}
        <ChatArea conversation={selectedConv} />
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default ChatPage;