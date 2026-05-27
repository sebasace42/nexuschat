const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const User         = require('../models/User');
const jwt          = require('jsonwebtoken');

const onlineUsers = new Map();

const setupSocket = (io) => {

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 Conectado: ${socket.userId}`);
    onlineUsers.set(socket.userId, socket.id);
    await User.findByIdAndUpdate(socket.userId, { isOnline: true });
    io.emit('users:online', Array.from(onlineUsers.keys()));
  
socket.on('message:delete', async ({ messageId, conversationId }) => {
  
  io.to(conversationId).emit('message:deleted', {
    messageId,
    conversationId,
  });
});

    socket.on('conversations:join', (ids) => {
      ids.forEach((id) => socket.join(id));
    });

    socket.on('message:send', async ({ conversationId, text }) => {
      if (!text?.trim()) return;
      try {
        let message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          text: text.trim(),
          readBy: [socket.userId],
        });
        message = await message.populate('sender', 'username avatarColor');

        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          { lastMessage: message._id, updatedAt: new Date() },
          { new: true }
        ).populate('participants', '-password');

        const others = conversation.participants.filter(
          (p) => p._id.toString() !== socket.userId
        );
        for (const p of others) {
          const cur = conversation.unreadCount?.get(p._id.toString()) || 0;
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCount.${p._id}`]: cur + 1 },
          });
          const sid = onlineUsers.get(p._id.toString());
          if (sid) io.to(sid).emit('conversation:updated', {
            conversationId, lastMessage: message,
          });
        }

        io.to(conversationId).emit('message:new', { message, conversationId });
      } catch (err) {
        console.error('Error message:send:', err);
      }
    });

    socket.on('typing:start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:start',
        { userId: socket.userId, conversationId });
    });
    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:stop',
        { userId: socket.userId, conversationId });
    });

    socket.on('message:react', async ({ messageId, emoji, conversationId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;
        const idx = msg.reactions.findIndex(
          (r) => r.user.toString() === socket.userId && r.emoji === emoji
        );
        if (idx > -1) msg.reactions.splice(idx, 1);
        else msg.reactions.push({ user: socket.userId, emoji });
        await msg.save();
        io.to(conversationId).emit('message:reaction',
          { messageId, reactions: msg.reactions });
      } catch (err) { console.error(err); }
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(socket.userId);
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false, lastSeen: new Date(),
      });
      io.emit('users:online', Array.from(onlineUsers.keys()));
    });
  });
};

module.exports = { setupSocket };