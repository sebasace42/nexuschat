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
   * CRÍTICO: Solo WebSocket, nunca polling.
   * Polling causa retrasos porque espera a que
   * el HTTP request complete antes de entregar el mensaje.
   */
  transports: ['websocket'],

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

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', time: new Date(), env: process.env.NODE_ENV })
);

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});