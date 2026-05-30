const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Texto del mensaje (opcional si hay archivo)
  text: {
    type: String,
    default: '',
    maxlength: 4000,
  },

  // ── CAMPOS MULTIMEDIA (nuevos) ──
  mediaUrl: {
    type: String,
    default: null,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', null],
    default: null,
  },
  mediaName: {
    type: String,
    default: null,
  },
  mediaSize: {
    type: Number,
    default: null,
  },
  mediaMimeType: {
    type: String,
    default: null,
  },
  // ID en Cloudinary para poder eliminarlo
  mediaPublicId: {
    type: String,
    default: null,
  },

  reactions: [{
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String },
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);