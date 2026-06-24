const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true,
    trim: true, minlength: 3, maxlength: 30,
  },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true,
  },
  password: { type: String, required: true, minlength: 6 },
  avatarColor: {
    type: String,
    default: () => {
      const colors = ['#5b4fcf','#1d9e75','#d85a30',
                      '#d4537e','#378add','#ba7517','#639922'];
      return colors[Math.floor(Math.random() * colors.length)];
    },
  },
  isOnline: { type: Boolean, default: false },
  lastSeen:  { type: Date,    default: Date.now },
  bio:       { type: String,  default: '', maxlength: 100 },

  // ── Privacidad de visibilidad ─────────────────────────────────
  hideOnline:      { type: Boolean, default: false },
  hideLastSeen:    { type: Boolean, default: false },
  hideReadReceipt: { type: Boolean, default: false },

  // ── Tipo de cuenta: privada (true) o pública (false) ─────────
  // Privada  → solo contactos aceptados pueden escribir y ver estados
  // Pública  → cualquier usuario puede escribir y ver estados
  isPrivate: { type: Boolean, default: false },

}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);