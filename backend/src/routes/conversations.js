const express      = require('express');
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const { protect }  = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
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
// Elimina toda la conversación y opcionalmente los archivos multimedia
router.delete('/:id', protect, async (req, res) => {
  try {
    const { deleteMedia } = req.body;
    const conversationId = req.params.id;

    // Verificar que el usuario es participante
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    const isParticipant = conversation.participants
      .some((p) => p.toString() === req.user._id.toString());

    if (!isParticipant) {
      return res.status(403).json({ message: 'No tienes acceso a esta conversación' });
    }

    // Si el usuario marcó "eliminar multimedia", borrar archivos de Cloudinary
    if (deleteMedia) {
      const mediaMessages = await Message.find({
        conversation: conversationId,
        mediaPublicId: { $ne: null },
      });

      // Eliminar en batches de 10 para no saturar la API
      const batches = [];
      for (let i = 0; i < mediaMessages.length; i += 10) {
        batches.push(mediaMessages.slice(i, i + 10));
      }

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map((msg) => {
            const resourceType = msg.mediaType === 'image' ? 'image'
              : msg.mediaType === 'document' ? 'raw'
              : 'video';
            return cloudinary.uploader.destroy(msg.mediaPublicId, {
              resource_type: resourceType,
            });
          })
        );
      }
    }

    // Eliminar todos los mensajes de la conversación
    await Message.deleteMany({ conversation: conversationId });

    // Eliminar la conversación
    await Conversation.findByIdAndDelete(conversationId);

    res.json({
      message: 'Chat eliminado correctamente',
      conversationId,
      mediaDeleted: deleteMedia || false,
    });

  } catch (err) {
    console.error('Error eliminando conversación:', err);
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
});

module.exports = router;