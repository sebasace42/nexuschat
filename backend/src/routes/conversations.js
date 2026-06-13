const express      = require('express');
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const { protect }  = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      // Solo mostrar conversaciones que NO están ocultas para este usuario
      hiddenBy: { $ne: req.user._id },
    })
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  const { recipientId } = req.body;
  if (!recipientId)
    return res.status(400).json({ message: 'recipientId es requerido' });
  try {
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    })
      .populate('participants', '-password')
      .populate('lastMessage');
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId], isGroup: false,
      });
      conversation = await conversation.populate('participants', '-password');
    }
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/messages', protect, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const total = await Message.countDocuments({ conversation: req.params.id });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'username avatarColor')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    await Message.updateMany(
      { conversation: req.params.id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    await Conversation.findByIdAndUpdate(req.params.id, {
      $set: { [`unreadCount.${req.user._id}`]: 0 },
    });

    res.json({
      messages,
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const { cloudinary } = require('../config/cloudinary');

// DELETE /api/conversations/:id
// NO borra la conversación — la oculta solo para este usuario (comportamiento WhatsApp)
router.delete('/:id', protect, async (req, res) => {
  try {
    const { deleteMedia } = req.body;
    const conversationId  = req.params.id;
    const userId          = req.user._id;

    // Verificar que existe y que el usuario es participante
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    const isParticipant = conversation.participants
      .some((p) => p.toString() === userId.toString());

    if (!isParticipant) {
      return res.status(403).json({ message: 'No tienes acceso a esta conversación' });
    }

    // Configurar query de actualización dinámica usando $addToSet
    const updateQuery = {
      $addToSet: { hiddenBy: userId },
    };

    if (deleteMedia) {
      updateQuery.$addToSet.deletedMediaBy = userId;
    }

    // Actualizar la conversación y obtener el estado nuevo con { new: true }
    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      updateQuery,
      { new: true }
    );

    let mediaRealmenteEliminada = false;

    // Verificar si TODOS los participantes solicitaron borrar multimedia
    const todosBorraronMedia =
      updatedConversation.participants.length === updatedConversation.deletedMediaBy.length;

    if (deleteMedia && todosBorraronMedia) {
      mediaRealmenteEliminada = true;

      // Buscar mensajes con archivos de toda la conversación
      const allMediaMessages = await Message.find({
        conversation: conversationId,
        mediaPublicId: { $ne: null },
      });

      // Eliminar de Cloudinary en batches de 10
      for (let i = 0; i < allMediaMessages.length; i += 10) {
        const batch = allMediaMessages.slice(i, i + 10);
        await Promise.allSettled(
          batch.map((msg) => {
            const resourceType = msg.mediaType === 'image'    ? 'image'
              : msg.mediaType === 'document' ? 'raw'
              : 'video';
            return cloudinary.uploader.destroy(msg.mediaPublicId, {
              resource_type: resourceType,
            });
          })
        );
      }
    }

    /*
     * ─── CAMBIO CLAVE ────────────────────────────────────────────────────────
     * El socket NO puede emitirse aquí porque routes no tiene acceso directo
     * al objeto io. Hay dos patrones comunes para resolverlo:
     *
     * PATRÓN A (recomendado si usas app.set / req.app.get):
     *   const io = req.app.get('io');
     *   const socketId = req.app.get('userSockets')?.[userId.toString()];
     *   if (socketId) io.to(socketId).emit('conversation:hidden', { conversationId });
     *
     * PATRÓN B (si exportas io desde otro módulo):
     *   const { io, userSockets } = require('../socket');
     *   const socketId = userSockets.get(userId.toString());
     *   if (socketId) io.to(socketId).emit('conversation:hidden', { conversationId });
     *
     * En AMBOS casos el evento se emite SOLO al socket del usuario que eliminó,
     * NO a toda la sala de la conversación.
     * ─────────────────────────────────────────────────────────────────────────
     */
    const io          = req.app.get('io');
    const userSockets = req.app.get('userSockets'); // Map<userId, socketId>

    if (io && userSockets) {
      const targetSocketId = userSockets.get(userId.toString());
      if (targetSocketId) {
        // Solo el usuario que eliminó recibe este evento
        io.to(targetSocketId).emit('conversation:hidden', {
          conversationId,
        });
      }
    }

    res.json({
      message:      'Chat eliminado de tu lista',
      conversationId,
      mediaDeleted: mediaRealmenteEliminada,
    });

  } catch (err) {
    console.error('Error ocultando conversación:', err);
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
});

module.exports = router;