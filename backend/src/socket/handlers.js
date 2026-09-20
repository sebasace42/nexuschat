const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const User         = require('../models/User');
const jwt          = require('jsonwebtoken');

const onlineUsers = new Map(); // userId → Set de socketIds (un user puede tener múltiples tabs)

const setupSocket = (io) => {

  /*
   * MIDDLEWARE DE AUTENTICACIÓN
   * Verifica el JWT antes de aceptar cualquier conexión.
   * Si el token es inválido, rechaza la conexión.
   */
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
    const userId = socket.userId;
    console.log(`🔌 Conectado: ${userId} (socket: ${socket.id})`);

    /*
     * GESTIÓN DE MÚLTIPLES DISPOSITIVOS
     * Un usuario puede tener el chat abierto en PC y celular.
     * Guardamos todos los socketIds en un Set.
     */
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
    });

    // Notificar a todos qué usuarios están online
    io.emit('users:online', Array.from(onlineUsers.keys()));

    /*
     * UNIRSE A SALAS DE CONVERSACIONES
     * El cliente envía sus conversationIds al conectarse.
     * Así recibe mensajes de todas sus conversaciones
     * aunque no esté activamente en una.
     */
    socket.on('conversations:join', (conversationIds) => {
      if (!Array.isArray(conversationIds)) return;
      conversationIds.forEach((id) => {
        socket.join(id);
        console.log(`📌 ${userId} unido a sala: ${id}`);
      });
    });

    /*
     * ENVIAR MENSAJE DE TEXTO
     *
     * Flujo:
     * 1. Cliente emite 'message:send'
     * 2. Guardamos en MongoDB
     * 3. Emitimos a TODA la sala (incluyendo al emisor)
     *    para confirmación visual inmediata
     * 4. Actualizamos el lastMessage de la conversación
     * 5. Notificamos el sidebar de los otros participantes
     */
    socket.on('message:send', async ({ conversationId, text, statusReply }) => {
      if (!text?.trim() || !conversationId) return;

      try {
        // ── Verificar bloqueo (en cualquiera de las 2 direcciones) ──
        // Nunca confiar solo en que el frontend deshabilitó el input:
        // si alguien intercepta el socket y emite igual, esto lo frena.
        const conversationCheck = await Conversation.findById(conversationId).select('participants');
        if (!conversationCheck) return;

        const recipientId = conversationCheck.participants
          .map((p) => p.toString())
          .find((pid) => pid !== userId);

        if (recipientId) {
          const [me, recipient] = await Promise.all([
            User.findById(userId).select('blockedUsers'),
            User.findById(recipientId).select('blockedUsers'),
          ]);

          const iBlockedThem  = me?.blockedUsers?.some((u) => u.toString() === recipientId);
          const theyBlockedMe = recipient?.blockedUsers?.some((u) => u.toString() === userId);

          if (iBlockedThem || theyBlockedMe) {
            socket.emit('error', { message: 'No puedes enviar mensajes a este usuario' });
            return;
          }
        }

        // Crear mensaje en MongoDB
        let message = await Message.create({
          conversation: conversationId,
          sender:       userId,
          text:         text.trim(),
          readBy:       [userId],
          statusReply:  statusReply || undefined,
        });

        // Popular sender para el frontend
        message = await message.populate('sender', 'username avatarColor');

        // Actualizar lastMessage y limpiar hiddenBy
        // (si alguien había ocultado el chat, vuelve a aparecer)
        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: message._id,
            updatedAt:   new Date(),
            $set:        { hiddenBy: [] }, // reaparecer para quien lo había ocultado
          },
          { new: true }
        ).populate('participants', '-password');

        if (!conversation) return;

        /*
         * EMITIR A LA SALA COMPLETA
         * io.to(sala) envía a TODOS los sockets en esa sala,
         * incluyendo múltiples tabs del mismo usuario.
         * Esto es lo que hace que el mensaje aparezca
         * instantáneamente sin recargar.
         */
        io.to(conversationId).emit('message:new', {
          message,
          conversationId,
        });

        // Actualizar sidebar de los otros participantes
        const others = conversation.participants.filter(
          (p) => p._id.toString() !== userId
        );

        for (const participant of others) {
          const pid = participant._id.toString();

          // Incrementar unreadCount
          const currentCount = conversation.unreadCount?.get(pid) || 0;
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCount.${pid}`]: currentCount + 1 },
          });

          // Notificar a TODOS los sockets del participante
          // (puede tener múltiples tabs abiertas)
          const participantSockets = onlineUsers.get(pid);
          if (participantSockets) {
            participantSockets.forEach((sid) => {
              io.to(sid).emit('conversation:updated', {
                conversationId,
                lastMessage: message,
              });
            });
          }
        }

      } catch (err) {
        console.error('❌ Error message:send:', err);
        socket.emit('error', { message: 'Error enviando mensaje' });
      }
    });

    /*
     * NUEVO MENSAJE MULTIMEDIA (imagen, video, audio, gif)
     * El archivo ya fue subido a Cloudinary por REST.
     * Este evento solo notifica a los demás en tiempo real.
     */
    socket.on('message:new_media', async ({ message, conversationId }) => {
      if (!message || !conversationId) return;

      try {
        // Limpiar hiddenBy igual que con mensajes de texto
        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: message._id,
            updatedAt:   new Date(),
            $set:        { hiddenBy: [] },
          },
          { new: true }
        ).populate('participants', '-password');

        if (!conversation) return;

        // Emitir a toda la sala
        io.to(conversationId).emit('message:new', {
          message,
          conversationId,
        });

        // Notificar sidebar de otros participantes
        const others = conversation.participants.filter(
          (p) => p._id.toString() !== userId
        );

        for (const participant of others) {
          const pid = participant._id.toString();
          const currentCount = conversation.unreadCount?.get(pid) || 0;
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCount.${pid}`]: currentCount + 1 },
          });

          const participantSockets = onlineUsers.get(pid);
          if (participantSockets) {
            participantSockets.forEach((sid) => {
              io.to(sid).emit('conversation:updated', {
                conversationId,
                lastMessage: message,
              });
            });
          }
        }
      } catch (err) {
        console.error('❌ Error message:new_media:', err);
      }
    });

    /*
     * CREAR ENCUESTA
     * Igual que message:send pero el mensaje lleva `poll` en vez de
     * `text`. Reutiliza la misma verificación de bloqueo.
     */
    socket.on('poll:create', async ({ conversationId, question, options, allowMultiple }) => {
      const cleanQuestion = question?.trim();
      const cleanOptions  = Array.isArray(options)
        ? options.map((o) => o.trim()).filter(Boolean)
        : [];

      if (!conversationId || !cleanQuestion || cleanOptions.length < 2) {
        socket.emit('error', { message: 'La encuesta necesita pregunta y al menos 2 opciones' });
        return;
      }

      try {
        const conversationCheck = await Conversation.findById(conversationId).select('participants');
        if (!conversationCheck) return;

        const recipientId = conversationCheck.participants
          .map((p) => p.toString())
          .find((pid) => pid !== userId);

        if (recipientId) {
          const [me, recipient] = await Promise.all([
            User.findById(userId).select('blockedUsers'),
            User.findById(recipientId).select('blockedUsers'),
          ]);

          const iBlockedThem  = me?.blockedUsers?.some((u) => u.toString() === recipientId);
          const theyBlockedMe = recipient?.blockedUsers?.some((u) => u.toString() === userId);

          if (iBlockedThem || theyBlockedMe) {
            socket.emit('error', { message: 'No puedes enviar mensajes a este usuario' });
            return;
          }
        }

        let message = await Message.create({
          conversation: conversationId,
          sender:       userId,
          readBy:       [userId],
          poll: {
            question:      cleanQuestion,
            options:       cleanOptions.map((text) => ({ text, votes: [] })),
            allowMultiple: !!allowMultiple,
          },
        });

        message = await message.populate('sender', 'username avatarColor');

        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          {
            lastMessage: message._id,
            updatedAt:   new Date(),
            $set:        { hiddenBy: [] },
          },
          { new: true }
        ).populate('participants', '-password');

        if (!conversation) return;

        io.to(conversationId).emit('message:new', {
          message,
          conversationId,
        });

        const others = conversation.participants.filter(
          (p) => p._id.toString() !== userId
        );

        for (const participant of others) {
          const pid = participant._id.toString();
          const currentCount = conversation.unreadCount?.get(pid) || 0;
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCount.${pid}`]: currentCount + 1 },
          });

          const participantSockets = onlineUsers.get(pid);
          if (participantSockets) {
            participantSockets.forEach((sid) => {
              io.to(sid).emit('conversation:updated', {
                conversationId,
                lastMessage: message,
              });
            });
          }
        }
      } catch (err) {
        console.error('❌ Error poll:create:', err);
        socket.emit('error', { message: 'Error creando la encuesta' });
      }
    });

    /*
     * VOTAR EN UNA ENCUESTA
     * Alterna el voto del usuario en esa opción. Si la encuesta no
     * permite varias respuestas, primero le quita cualquier voto
     * que tuviera en las demás opciones.
     */
    socket.on('poll:vote', async ({ messageId, optionId, conversationId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || !msg.poll) return;

        const option = msg.poll.options.id(optionId);
        if (!option) return;

        const hasVoted = option.votes.some((v) => v.toString() === userId);

        if (hasVoted) {
          option.votes = option.votes.filter((v) => v.toString() !== userId);
        } else {
          if (!msg.poll.allowMultiple) {
            msg.poll.options.forEach((opt) => {
              opt.votes = opt.votes.filter((v) => v.toString() !== userId);
            });
          }
          option.votes.push(userId);
        }

        await msg.save();

        io.to(conversationId).emit('poll:updated', {
          messageId,
          poll: msg.poll,
        });
      } catch (err) {
        console.error('❌ Error poll:vote:', err);
      }
    });

    /*
     * MARCAR MENSAJES COMO LEÍDOS
     *
     * El frontend emite esto al abrir un chat. Hasta ahora nadie lo
     * escuchaba en el backend, por eso unreadCount nunca se reiniciaba
     * en la base de datos: el badge desaparecía solo en el estado local
     * de React, pero al refrescar volvía a traer el número viejo.
     */
    socket.on('message:read', async ({ conversationId }) => {
      if (!conversationId) return;

      try {
        // Reiniciar el contador de no leídos de ESTE usuario, en la BD.
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { [`unreadCount.${userId}`]: 0 },
        });

        // Si el usuario oculta sus confirmaciones de lectura, reseteamos
        // el contador (arriba) pero no delatamos que leyó los mensajes.
        const me = await User.findById(userId).select('hideReadReceipt');
        if (me?.hideReadReceipt) return;

        // Mensajes de otros, en esta conversación, que yo no había leído
        const unreadMessages = await Message.find({
          conversation: conversationId,
          sender:       { $ne: userId },
          readBy:       { $ne: userId },
        }).select('_id sender');

        if (unreadMessages.length === 0) return;

        await Message.updateMany(
          { _id: { $in: unreadMessages.map((m) => m._id) } },
          {
            $addToSet: { readBy: userId },
            $set:      { status: 'read', readAt: new Date() },
          }
        );

        // Avisar en tiempo real a quien envió esos mensajes
        // (para que le aparezca el doble check azul).
        const senderIds = [...new Set(unreadMessages.map((m) => m.sender.toString()))];
        const messageIds = unreadMessages.map((m) => m._id.toString());

        senderIds.forEach((sid) => {
          const sockets = onlineUsers.get(sid);
          if (sockets) {
            sockets.forEach((sockId) => {
              io.to(sockId).emit('messages:read', {
                conversationId,
                readBy: userId,
                messageIds,
              });
            });
          }
        });
      } catch (err) {
        console.error('❌ Error message:read:', err);
      }
    });

    /*
     * ELIMINAR MENSAJE
     * Backend elimina de MongoDB y notifica a la sala.
     */
    socket.on('message:delete', async ({ messageId, conversationId }) => {
      try {
        io.to(conversationId).emit('message:deleted', {
          messageId,
          conversationId,
        });
      } catch (err) {
        console.error('❌ Error message:delete:', err);
      }
    });

    /*
     * REACCIONAR A MENSAJE
     */
    socket.on('message:react', async ({ messageId, emoji, conversationId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;

        const idx = msg.reactions.findIndex(
          (r) => r.user.toString() === userId && r.emoji === emoji
        );

        if (idx > -1) msg.reactions.splice(idx, 1);
        else msg.reactions.push({ user: userId, emoji });

        await msg.save();

        io.to(conversationId).emit('message:reaction', {
          messageId,
          reactions: msg.reactions,
        });
      } catch (err) {
        console.error('❌ Error message:react:', err);
      }
    });

    /*
     * INDICADOR DE ESCRITURA
     * Emite solo a los demás en la sala, no al emisor.
     */
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:start', {
        userId,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    /*
     * ELIMINAR CONVERSACIÓN (solo para el usuario actual)
     * No notificamos a los demás — es una acción privada.
     */
    socket.on('conversation:delete', ({ conversationId }) => {
      socket.emit('conversation:deleted', { conversationId });
    });

    /*
     * DESCONEXIÓN
     * Limpiamos el socketId del Set del usuario.
     * Si no quedan más sockets, marcamos como offline.
     */
    socket.on('disconnect', async (reason) => {
      console.log(`🔌 Desconectado: ${userId} (razón: ${reason})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
        }
      }

      io.emit('users:online', Array.from(onlineUsers.keys()));
    });
  });
};

module.exports = { setupSocket };