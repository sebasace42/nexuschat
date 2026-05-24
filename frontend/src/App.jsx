import { useAuth }        from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-void">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm">Cargando NexusChat...</p>
        </div>
      </div>
    );
  }

  return user ? (
    <SocketProvider>
      <ChatPage />
    </SocketProvider>
  ) : (
    <AuthPage />
  );
};
export default App;