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
  text: {
    type: String,
    default: '',
    maxlength: 4000,
  },
 
  // ── Multimedia (Cloudinary) ──────────────────────────────────
  mediaUrl:      { type: String,  default: null },
  mediaType:     { type: String,  enum: ['image','video','audio','document', null], default: null },
  mediaName:     { type: String,  default: null },
  mediaSize:     { type: Number,  default: null },
  mediaMimeType: { type: String,  default: null },
  mediaPublicId: { type: String,  default: null },
 
  // ── Doble check azul ─────────────────────────────────────────
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  deliveredAt: { type: Date, default: null },
  readAt:      { type: Date, default: null },
 
  reactions: [{
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String },
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  // ── Respuesta a un estado/historia ───────────────────────────
  // Se guarda como "foto" del estado (no como referencia) porque
  // el estado original expira/se borra a las 24h y la respuesta
  // debe seguir mostrándose igual que en WhatsApp.
  statusReply: {
    statusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Status', default: null },
    type:     { type: String, enum: ['text', 'image', 'video', null], default: null },
    text:     { type: String, default: '' },
    bgColor:  { type: String, default: null },
    mediaUrl: { type: String, default: null },
  },

}, { timestamps: true });
 
messageSchema.index({ conversation: 1, sender: 1, status: 1 });
 
module.exports = mongoose.model('Message', messageSchema);