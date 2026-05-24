import { useState } from 'react';
import ServerBar     from '../components/layout/ServerBar';
import Sidebar       from '../components/layout/Sidebar';
import ChatArea      from '../components/chat/ChatArea';
import SettingsModal from '../components/modals/SettingsModal';

const ChatPage = () => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-void">
      <ServerBar onOpenSettings={() => setShowSettings(true)} />
      <Sidebar selectedConv={selectedConv} onSelectConversation={setSelectedConv} />
      <ChatArea conversation={selectedConv} />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};
export default ChatPage;