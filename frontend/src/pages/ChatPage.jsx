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
     * Contenedor raíz: flex en fila, ocupa toda la pantalla.
     * overflow-hidden evita scrollbars no deseados.
     */
    <div className="h-screen w-screen flex flex-row overflow-hidden bg-void">

      {/*
       * ── COLUMNA 1: ServerBar ──────────────────────────────
       * hidden     → oculto en móvil (no necesitamos los iconos de servidor en móvil)
       * md:flex    → visible en PC como columna flex
       * flex-shrink-0 → no se encoge aunque el espacio sea poco
       */}
      <div className="hidden md:flex flex-shrink-0">
        <ServerBar onOpenSettings={() => setShowSettings(true)} />
      </div>

      {/*
       * ── COLUMNA 2: Sidebar (lista de chats) ──────────────
       *
       * LÓGICA MÓVIL vs PC:
       *
       * Sin chat seleccionado (selectedConv === null):
       *   móvil → "flex w-full"     = pantalla completa
       *   PC    → "md:flex md:w-[240px]" = columna fija
       *
       * Con chat seleccionado (selectedConv !== null):
       *   móvil → "hidden"          = desaparece completamente
       *   PC    → "md:flex md:w-[240px]" = sigue visible (md: sobreescribe hidden)
       *
       * Traducción: en PC el "md:flex" SIEMPRE gana sobre cualquier "hidden"
       * porque md: tiene mayor especificidad en Tailwind.
       */}
      <div
        className={`
          flex-shrink-0 flex-col border-r border-white/5 overflow-hidden
          md:flex md:w-[240px]
          ${selectedConv === null
            ? 'flex w-full'   // móvil sin chat: pantalla completa
            : 'hidden'        // móvil con chat: desaparece (PC lo sobreescribe con md:flex)
          }
        `}
      >
        <Sidebar
          selectedConv={selectedConv}
          onSelectConversation={(conv) => setSelectedConv(conv)}
        />
      </div>

      {/*
       * ── COLUMNA 3: ChatArea (área de mensajes) ────────────
       *
       * Sin chat seleccionado (selectedConv === null):
       *   móvil → "hidden"      = desaparece (no hay nada que mostrar)
       *   PC    → "md:flex"     = siempre visible (muestra pantalla de bienvenida)
       *
       * Con chat seleccionado (selectedConv !== null):
       *   móvil → "flex w-full" = pantalla completa
       *   PC    → "md:flex"     = ocupa el resto del espacio (flex-1)
       *
       * flex-1 hace que esta columna ocupe TODO el espacio restante en PC.
       */}
      <div
        className={`
          flex-col flex-1 overflow-hidden
          md:flex
          ${selectedConv !== null
            ? 'flex w-full'   // móvil con chat: pantalla completa
            : 'hidden'        // móvil sin chat: desaparece (PC lo sobreescribe con md:flex)
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