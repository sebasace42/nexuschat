import { useState } from 'react';
import Login    from '../components/auth/Login';
import Register from '../components/auth/Register';

const AuthPage = () => {
  const [view, setView] = useState('login');
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-void overflow-auto py-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-accent opacity-5 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-extrabold text-white tracking-tight">
            Nexus<span className="text-accent">Chat</span>
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Mensajería instantánea. Sin límites.
          </p>
        </div>
        <div className="bg-panel border border-white/5 rounded-2xl p-8 shadow-2xl">
          {view === 'login'
            ? <Login    onSwitch={() => setView('register')} />
            : <Register onSwitch={() => setView('login')} />
          }
        </div>
      </div>
    </div>
  );
};
export default AuthPage;