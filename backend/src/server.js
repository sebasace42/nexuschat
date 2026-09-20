require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const connectDB  = require('./config/db');
const { setupSocket } = require('./socket/handlers');

const authRoutes          = require('./routes/auth');
const usersRoutes         = require('./routes/users');
const conversationsRoutes = require('./routes/conversations');
const messagesRoutes      = require('./routes/messages');
const uploadRoutes        = require('./routes/upload');
const statusRoutes        = require('./routes/status');
const friendsRoutes       = require('./routes/friends');
const channelsRoutes      = require('./routes/channels');

connectDB();

const app    = express();
const server = http.createServer(app);

/*
 * CONFIGURACIÓN CRÍTICA DE SOCKET.IO PARA PRODUCCIÓN
 *
 * El problema principal en Cloudflare + Render es que
 * Socket.io intenta usar WebSocket pero Cloudflare
 * lo intercepta y lo degrada a long-polling HTTP,
 * causando retrasos de 1-3 segundos por mensaje.
 *
 * Solución: forzar WebSocket desde el inicio y
 * configurar los timeouts correctamente.
 */
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL === '*'
      ? '*'
      : [process.env.CLIENT_URL],
    methods:     ['GET', 'POST', 'DELETE'],
    credentials: true,
  },

  /*
   * Permitimos polling como respaldo y dejamos que Socket.io
   * haga el upgrade a websocket automáticamente. Forzar SOLO
   * websocket puede impedir la conexión por completo en redes,
   * proxys o navegadores que no soportan el handshake directo
   * por WS (esto puede ser la causa real de que algunos usuarios
   * nunca reciban notificaciones en tiempo real, incluidos los
   * estados nuevos de sus contactos). Una vez conectado, Socket.io
   * sube a websocket igual, así que no se pierde la mejora de latencia.
   */
  transports: ['polling', 'websocket'],

  /*
   * Timeouts ajustados para Render (que puede ser lento
   * en el plan gratuito al despertar).
   */
  pingTimeout:  60000,  // 60s antes de considerar desconexión
  pingInterval: 25000,  // ping cada 25s para mantener vivo
  upgradeTimeout: 30000,

  /*
   * Permite que el cliente reconecte con el mismo ID
   * si se desconecta brevemente (importante para móviles).
   */
  allowEIO3: true,
});

setupSocket(io);

// Exponer io y userSockets para que las rutas puedan emitir eventos
// (lo usan friends.js y status.js para notificaciones en tiempo real)
app.set('io', io);

// userSockets: Map de userId → socketId
// Se llena en handlers.js cuando un usuario se conecta
const userSockets = new Map();
app.set('userSockets', userSockets);

app.use(cors({
  origin: process.env.CLIENT_URL === '*'
    ? '*'
    : [process.env.CLIENT_URL],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages',      messagesRoutes);
app.use('/api/upload',        uploadRoutes);
app.use('/api/status',        statusRoutes);
app.use('/api/friends',       friendsRoutes);
app.use('/api/channels',      channelsRoutes);
app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', time: new Date(), env: process.env.NODE_ENV })
);

const PORT = process.env.PORT || 7860;
server.listen(PORT, '0.0.0.0', () => {
  console.log(` Servidor en puerto ${PORT}`);
});