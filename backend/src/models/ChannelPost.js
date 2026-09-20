const mongoose = require('mongoose');

/*
 * ChannelPost — Una publicación dentro de un Canal.
 * Estructura similar a Message pero sin sender variable (siempre
 * es el dueño del canal) ni threads de conversación normal.
 */
const channelPostSchema = new mongoose.Schema({
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
  },
  text: {
    type: String,
    default: '',
    maxlength: 4000,
  },

  // ── Multimedia (Cloudinary), mismo patrón que Message ─────────
  mediaUrl:      { type: String, default: null },
  mediaType:     { type: String, enum: ['image','video','audio','document', null], default: null },
  mediaName:     { type: String, default: null },
  mediaSize:     { type: Number, default: null },
  mediaMimeType: { type: String, default: null },
  mediaPublicId: { type: String, default: null },

  reactions: [{
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String },
  }],

}, { timestamps: true });

channelPostSchema.index({ channel: 1, createdAt: -1 });

module.exports = mongoose.model('ChannelPost', channelPostSchema);