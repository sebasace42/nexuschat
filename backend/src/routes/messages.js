const express      = require('express');
const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const { protect }  = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');

const router = express.Router();

router.delete('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No puedes eliminar mensajes de otros' });
    }

    const conversationId = message.conversation.toString();

    // Si el mensaje tiene archivo, eliminarlo de Cloudinary
    if (message.mediaPublicId) {
      try {
        const resourceType = message.mediaType === 'image' ? 'image'
          : message.mediaType === 'document' ? 'raw'
          : 'video';

        await cloudinary.uploader.destroy(message.mediaPublicId, {
          resource_type: resourceType,
        });
        console.log(`✅ Archivo eliminado de Cloudinary: ${message.mediaPublicId}`);
      } catch (cloudErr) {
        console.error('Error eliminando de Cloudinary:', cloudErr);
        // Continuamos aunque falle Cloudinary
      }
    }

    await Message.findByIdAndDelete(req.params.id);

    // Actualizar lastMessage si era el último
    const conversation = await Conversation.findById(conversationId);
    if (conversation?.lastMessage?.toString() === req.params.id) {
      const previousMessage = await Message.findOne({
        conversation: conversationId,
      }).sort({ createdAt: -1 });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: previousMessage?._id || null,
      });
    }

    res.json({ messageId: req.params.id, conversationId });

  } catch (err) {
    console.error('Error eliminando mensaje:', err);
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
});

module.exports = router;