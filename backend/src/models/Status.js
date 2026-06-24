const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
    required: true,
  },
  // Tipo: texto, imagen o video
  type: {
    type: String,
    enum: ['text', 'image', 'video'],
    required: true,
  },
  // Contenido de texto (si type === 'text')
  text: {
    type: String,
    default: '',
    maxlength: 700,
  },
  // Color de fondo para estados de texto
  bgColor: {
    type: String,
    default: '#5b4fcf',
  },
  // URL de Cloudinary (si type === 'image' o 'video')
  mediaUrl:      { type: String, default: null },
  mediaPublicId: { type: String, default: null },

  // Quiénes lo han visto
  views: [{
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now },
  }],

  // Expira automáticamente en 24 horas
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expires: 0 }, // TTL index — MongoDB lo borra solo
  },
}, { timestamps: true });

module.exports = mongoose.model('Status', statusSchema);