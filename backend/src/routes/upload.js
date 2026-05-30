const express    = require('express');
const { upload, cloudinary } = require('../config/cloudinary');
const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const { protect }  = require('../middleware/auth');

const router = express.Router();

// Detectar mediaType según el mimetype del archivo
const getMediaType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
};

// POST /api/upload
// Sube un archivo a Cloudinary y crea el mensaje en MongoDB
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    const { conversationId, text } = req.body;

    if (!conversationId) {
      return res.status(400).json({ message: 'conversationId es requerido' });
    }

    if (!req.file && !text?.trim()) {
      return res.status(400).json({ message: 'Necesitas enviar un archivo o texto' });
    }

    // Construir el objeto del mensaje
    const messageData = {
      conversation: conversationId,
      sender:       req.user._id,
      text:         text?.trim() || '',
      readBy:       [req.user._id],
    };

    // Si hay archivo, agregar los datos multimedia
    if (req.file) {
      messageData.mediaUrl      = req.file.path;        // URL de Cloudinary
      messageData.mediaType     = getMediaType(req.file.mimetype);
      messageData.mediaName     = req.file.originalname;
      messageData.mediaSize     = req.file.size;
      messageData.mediaMimeType = req.file.mimetype;
      messageData.mediaPublicId = req.file.filename;    // public_id en Cloudinary
    }

    // Guardar mensaje en MongoDB
    let message = await Message.create(messageData);
    message = await message.populate('sender', 'username avatarColor');

    // Actualizar lastMessage de la conversación
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt:   new Date(),
    });

    res.status(201).json(message);

  } catch (err) {
    console.error('Error subiendo archivo:', err);
    res.status(500).json({ message: err.message || 'Error del servidor' });
  }
});

module.exports = router;