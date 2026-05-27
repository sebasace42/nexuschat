const express      = require('express');
const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const { protect }  = require('../middleware/auth');

const router = express.Router();

// DELETE /api/messages/:id
// Solo el autor puede eliminar su propio mensaje
router.delete('/:id', protect, async (req, res) => {
  try {
    // 1. Buscar el mensaje por ID
    const message = await Message.findById(req.params.id);

    // 2. Verificar que existe
    if (!message) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    // 3. Verificar que el usuario que pide eliminarlo es el autor
    //    Convertimos a string porque MongoDB devuelve ObjectId
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No puedes eliminar mensajes de otros usuarios' });
    }

    const conversationId = message.conversation.toString();

    // 4. Eliminar el mensaje de MongoDB
    await Message.findByIdAndDelete(req.params.id);

    // 5. Si este era el lastMessage de la conversación,
    //    actualizamos con el mensaje anterior
    const conversation = await Conversation.findById(conversationId);
    if (conversation?.lastMessage?.toString() === req.params.id) {
      // Buscar el mensaje más reciente que quede
      const previousMessage = await Message.findOne({
        conversation: conversationId,
      }).sort({ createdAt: -1 });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: previousMessage?._id || null,
      });
    }

    // 6. Devolver el ID del mensaje eliminado y la sala
    //    para que el frontend emita el socket
    res.json({
      messageId:      req.params.id,
      conversationId,
    });

  } catch (err) {
    console.error('Error eliminando mensaje:', err);
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
});

module.exports = router;