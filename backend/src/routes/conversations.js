const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const { protect } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');

const router = express.Router();

// ═════════════════════════════════════════════════════════════════════
// GET /api/conversations — Lista de conversaciones del usuario (sidebar)
// ═════════════════════════════════════════════════════════════════════
router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      hiddenBy: { $ne: req.user._id }, // oculta las que el usuario "eliminó"
    })
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// GET /api/conversations/:id — Una conversación puntual
// (la usa el Sidebar cuando llega conversation:updated de un chat nuevo)
// ═════════════════════════════════════════════════════════════════════
router.get('/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', '-password')
      .populate('lastMessage');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// GET /api/conversations/:id/messages — Historial paginado
// ═════════════════════════════════════════════════════════════════════
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Respeta el "borrar historial" por usuario (deletedBefore)
    const deletedBefore = conversation.deletedBefore?.get(req.user._id.toString());

    const query = { conversation: id };
    if (deletedBefore) query.createdAt = { $gt: deletedBefore };

    const total = await Message.countDocuments(query);

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })   // más reciente primero para paginar
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'username avatarColor')
      .populate('reactions.user', 'username');

    messages.reverse(); // orden cronológico ascendente para renderizar

    res.json({
      messages,
      hasMore: page * limit < total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// POST /api/conversations — Crear conversación (con validación de privacidad)
// ═════════════════════════════════════════════════════════════════════
router.post('/', protect, async (req, res) => {
  const { recipientId } = req.body;

  if (!recipientId) {
    return res.status(400).json({ message: 'recipientId es requerido' });
  }

  try {
    const recipient = await User.findById(recipientId).select('username avatarColor isPrivate');

    if (!recipient) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (recipient.isPrivate) {
      const friendship = await Friendship.findOne({
        $or: [
          { requester: req.user._id, recipient: recipientId },
          { requester: recipientId, recipient: req.user._id },
        ],
        status: 'accepted',
      });

      if (!friendship) {
        const pending = await Friendship.findOne({
          $or: [
            { requester: req.user._id, recipient: recipientId },
            { requester: recipientId, recipient: req.user._id },
          ],
        });

        const friendStatus = !pending
          ? 'none'
          : pending.requester.toString() === req.user._id.toString()
          ? 'pending_sent'
          : 'pending_received';

        return res.status(403).json({
          message: 'Este perfil es privado. Debes ser un contacto aceptado para escribirle.',
          isPrivate: true,
          friendStatus,
        });
      }
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    })
      .populate('participants', '-password')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId],
        isGroup: false,
      });
      conversation = await conversation.populate('participants', '-password');
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// DELETE /api/conversations/:id — Ocultar/eliminar conversación
// (estilo WhatsApp: solo se borra de verdad cuando AMBOS la ocultaron)
// ═════════════════════════════════════════════════════════════════════
router.delete('/:id', protect, async (req, res) => {
  try {
    const { deleteMedia } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    const userId = req.user._id.toString();
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (!conversation.hiddenBy.map(String).includes(userId)) {
      conversation.hiddenBy.push(req.user._id);
    }
    conversation.deletedBefore.set(userId, new Date());
    await conversation.save();

    const allHidden = conversation.participants.every((p) =>
      conversation.hiddenBy.map(String).includes(p.toString())
    );

    if (allHidden) {
      if (deleteMedia) {
        const mediaMessages = await Message.find({
          conversation: conversation._id,
          mediaPublicId: { $ne: null },
        });
        for (const m of mediaMessages) {
          try {
            const resourceType = m.mediaType === 'image' ? 'image'
              : m.mediaType === 'document' ? 'raw'
              : 'video';
            await cloudinary.uploader.destroy(m.mediaPublicId, { resource_type: resourceType });
          } catch (e) {
            console.error('Error eliminando media de Cloudinary:', e);
          }
        }
      }
      await Message.deleteMany({ conversation: conversation._id });
      await Conversation.findByIdAndDelete(conversation._id);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;