const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isGroup:   { type: Boolean, default: false },
  groupName: { type: String,  default: '' },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  unreadCount: { 
    type: Map, 
    of: Number, 
    default: {} 
  },

  /*
   * SISTEMA DE ELIMINACIÓN ESTILO WHATSAPP
   * hiddenBy: array de userIds que ocultaron esta conversación.
   */
  hiddenBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  deletedBefore: {
    type: Map,
    of:   Date,
    default: {},
  },

}, { timestamps: true });

// ÍNDICES PARA CONSULTAS EFICIENTES
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ hiddenBy: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);