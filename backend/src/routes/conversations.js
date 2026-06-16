const express      = require('express');
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const { protect }  = require('../middleware/auth');

let cloudinary;
try {
  cloudinary = require('../config/cloudinary').cloudinary;
} catch {
  cloudinary = null;
}

const router = express.Router();

// GET /api/conversations
// Lista las conversaciones visibles para el usuario
router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      /*
       * Solo mostrar conversaciones donde el usuario
       * NO está en hiddenBy.
       * $ne = "not equal" / "not in array"
       */
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

// POST /api/conversations
// Crear o recuperar una conversación directa
router.post('/', protect, async (req, res) => {
  const { recipientId } = req.body;
  if (!recipientId) {
    return res.status(400).json({ message: 'recipientId es requerido' });
  }

  try {
    /*
     * Buscar conversación existente entre estos dos usuarios.
     * Incluimos las ocultas porque si el usuario escribe de nuevo,
     * debe retomar la conversación existente.
     */
    let conv = await Conversation.findOne({
      isGroup:      false,
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    })
      .populate('participants', '-password')
      .populate('lastMessage');

    if (!conv) {
      conv = await Conversation.create({
        participants: [req.user._id, recipientId],
        isGroup:      false,
      });
      conv = await conv.populate('participants', '-password');
    } else {
      /*
       * Si la conversación existía pero estaba oculta para el usuario,
       * la "desocultamos" al iniciarla de nuevo.
       */
      if (conv.hiddenBy?.includes(req.user._id)) {
        await Conversation.findByIdAndUpdate(conv._id, {
          $pull: { hiddenBy: req.user._id },
        });
      }
    }

    res.json(conv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/conversations/:id/messages
// Carga los mensajes respetando la fecha de eliminación del usuario
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    /*
     * FILTRO DE MENSAJES HISTÓRICOS
     *
     * Si el usuario borró el chat en algún momento,
     * guardamos esa fecha en deletedBefore.
     * Al recargar, solo mostramos mensajes POSTERIORES
     * a esa fecha — los anteriores siguen "borrados" para él.
     */
    const userId      = req.user._id.toString();
    const deletedDate = conversation.deletedBefore?.get(userId);

    const query = { conversation: req.params.id };
    if (deletedDate) {
      query.createdAt = { $gt: deletedDate };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username avatarColor')
      .sort({ createdAt: 1 })
      .limit(100);

    // Marcar como leídos
    await Message.updateMany(
      {
        conversation: req.params.id,
        readBy:       { $ne: req.user._id },
        ...(deletedDate ? { createdAt: { $gt: deletedDate } } : {}),
      },
      { $addToSet: { readBy: req.user._id } }
    );

    // Resetear unreadCount
    await Conversation.findByIdAndUpdate(req.params.id, {
      $set: { [`unreadCount.${req.user._id}`]: 0 },
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/conversations/:id
// Ocultar conversación solo para este usuario (estilo WhatsApp)
router.delete('/:id', protect, async (req, res) => {
  try {
    const { deleteMedia } = req.body;
    const conversationId  = req.params.id;
    const userId          = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    const isParticipant = conversation.participants
      .some((p) => p.toString() === userId.toString());

    if (!isParticipant) {
      return res.status(403).json({ message: 'Sin acceso' });
    }

    /*
     * Guardar la fecha actual como "fecha de eliminación" del usuario.
     * Los mensajes anteriores a esta fecha no se mostrarán.
     * Los mensajes posteriores sí (si alguien escribe de nuevo).
     */
    const updates = {
      $addToSet: { hiddenBy: userId },
      $set:      { [`deletedBefore.${userId}`]: new Date() },
    };

    await Conversation.findByIdAndUpdate(conversationId, updates);

    // Eliminar archivos de Cloudinary que el usuario envió
    if (deleteMedia && cloudinary) {
      const myMediaMessages = await Message.find({
        conversation:  conversationId,
        sender:        userId,
        mediaPublicId: { $ne: null },
      });

      for (let i = 0; i < myMediaMessages.length; i += 10) {
        const batch = myMediaMessages.slice(i, i + 10);
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

    res.json({
      message:      'Chat eliminado de tu lista',
      conversationId,
    });

  } catch (err) {
    console.error('Error eliminando conversación:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;