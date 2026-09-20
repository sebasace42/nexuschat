const mongoose = require('mongoose');

/*
 * Channel — "Canal de difusión" estilo WhatsApp Channels.
 * Solo el dueño (owner) puede publicar. Cualquier usuario puede
 * seguirlo/dejar de seguirlo. El dueño se sigue a sí mismo desde
 * que lo crea (para que aparezca en "Mis canales").
 */
const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  avatarColor: {
    type: String,
    default: '#7c6cf6',
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  lastPostAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

channelSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Channel', channelSchema);