const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,
  },
  text:      { type: String, required: true, maxlength: 4000 },
  reactions: [{
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String },
  }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ── Doble check azul ──────────────────────────────────────────
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  deliveredAt: { type: Date, default: null },
  readAt:      { type: Date, default: null },
  // ─────────────────────────────────────────────────────────────

}, { timestamps: true });

// Índice para acelerar las queries de estado
messageSchema.index({ conversation: 1, sender: 1, status: 1 });

module.exports = mongoose.model('Message', messageSchema);