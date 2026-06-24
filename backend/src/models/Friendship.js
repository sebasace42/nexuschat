const mongoose = require('mongoose');

/*
 * Modelo de Amistad / Solicitud de contacto
 *
 * Un documento representa la relación entre dos usuarios.
 * status:
 *   'pending'  → requester envió solicitud, recipient no ha respondido
 *   'accepted' → ambos son contactos
 *   'rejected' → recipient rechazó (opcional, se puede borrar en su lugar)
 *
 * Índice único compuesto: no pueden existir dos documentos para el mismo par.
 */
const friendshipSchema = new mongoose.Schema({
  requester: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  recipient: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  status: {
    type:    String,
    enum:    ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

// Evita duplicados en ambas direcciones
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

module.exports = mongoose.model('Friendship', friendshipSchema);