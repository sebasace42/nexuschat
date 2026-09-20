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

  // ── Mensajes destacados (estilo WhatsApp) ────────────────────
  // Cada usuario puede destacar cualquier mensaje (propio o ajeno)
  // de forma independiente. No es un campo global "isStarred": es
  // una lista de quiénes lo destacaron, igual que readBy/reactions.
  starredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  // ── Respuesta a un estado/historia ───────────────────────────
  // Se guarda como "foto" del estado (no como referencia) porque
  // el estado original expira/se borra a las 24h y la respuesta
  // debe seguir mostrándose igual que en WhatsApp.
  //
  // OJO: se define como sub-schema real (new mongoose.Schema(...))
  // y no como objeto plano. Con un objeto plano, Mongoose crea el
  // campo con sus valores por defecto (statusId: null, etc.) en
  // TODOS los mensajes aunque no sean respuesta a nada, y ese
  // objeto "vacío" sigue siendo truthy en JS — por eso el preview
  // aparecía en todos los mensajes. Con un sub-schema, el
  // `default: null` de más abajo sí se respeta y el campo queda
  // realmente en null cuando no se manda.
  statusReply: {
    type: new mongoose.Schema({
      statusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
      type:     { type: String, enum: ['text', 'image', 'video'] },
      text:     { type: String },
      bgColor:  { type: String },
      mediaUrl: { type: String },
    }, { _id: false }),
    default: null,
  },

}, { timestamps: true });
 
messageSchema.index({ conversation: 1, sender: 1, status: 1 });
 
module.exports = mongoose.model('Message', messageSchema);