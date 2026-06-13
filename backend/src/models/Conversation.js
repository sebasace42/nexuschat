const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isGroup:     { type: Boolean, default: false },
  groupName:   { type: String,  default: '' },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  unreadCount: { type: Map, of: Number, default: {} },

  /*
   * NUEVO — hiddenBy
   * Array de IDs de usuarios que ocultaron esta conversación.
   * Si tu ID está aquí, no ves la conversación en tu sidebar.
   * Si el otro usuario te escribe, tu ID se elimina del array
   * y la conversación vuelve a aparecer.
   */
  hiddenBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  /*
   * NUEVO — deletedMediaBy
   * Guarda qué usuarios eliminaron los archivos multimedia.
   * Solo afecta a Cloudinary si TODOS los participantes
   * han marcado deleteMedia.
   */
  deletedMediaBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);