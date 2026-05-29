const express = require('express');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/search', protect, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { $or: [
          { username: { $regex: q, $options: 'i' } },
          { email:    { $regex: q, $options: 'i' } },
        ]},
      ],
    }).select('-password').limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/users/profile — editar perfil ───────────────────────
router.put('/profile', protect, async (req, res) => {
  const { username, bio, avatarColor } = req.body;

  // Validaciones básicas
  if (!username || username.trim().length < 3)
    return res.status(400).json({ message: 'El nombre necesita al menos 3 caracteres' });

  try {
    // Verificar que el username no lo use otro usuario
    const existing = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.user._id },
    });
    if (existing)
      return res.status(400).json({ message: 'Ese nombre de usuario ya está en uso' });

    // Actualizar en la base de datos
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        username:    username.trim(),
        bio:         bio?.trim() ?? '',
        avatarColor: avatarColor ?? req.user.avatarColor,
      },
      { new: true }          // devuelve el documento ya actualizado
    ).select('-password');

    // Devolver los campos que el frontend necesita
    res.json({
      _id:         updated._id,
      username:    updated.username,
      email:       updated.email,
      avatarColor: updated.avatarColor,
      bio:         updated.bio,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
});

module.exports = router;