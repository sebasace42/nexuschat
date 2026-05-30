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
const messagesRoutes = require('./routes/messages');
connectDB();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});
setupSocket(io);

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages',      messagesRoutes); 

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', time: new Date() })
);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});

// Agrega este require junto a los demás
const uploadRoutes = require('./routes/upload');

// Agrega este use junto a los demás
app.use('/api/upload', uploadRoutes);