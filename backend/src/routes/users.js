const express = require('express');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/users/search ─────────────────────────────────────────────────────
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

// ── PUT /api/users/profile — editar perfil ────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  const { username, bio, avatarColor, hideOnline, hideLastSeen, hideReadReceipt } = req.body;

  if (!username || username.trim().length < 3)
    return res.status(400).json({ message: 'El nombre necesita al menos 3 caracteres' });

  try {
    const existing = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.user._id },
    });
    if (existing)
      return res.status(400).json({ message: 'Ese nombre de usuario ya está en uso' });

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        username:        username.trim(),
        bio:             bio?.trim() ?? '',
        avatarColor:     avatarColor     ?? req.user.avatarColor,
        hideOnline:      hideOnline      ?? req.user.hideOnline,
        hideLastSeen:    hideLastSeen    ?? req.user.hideLastSeen,
        hideReadReceipt: hideReadReceipt ?? req.user.hideReadReceipt,
      },
      { new: true }
    ).select('-password');

    res.json({
      _id:             updated._id,
      username:        updated.username,
      email:           updated.email,
      avatarColor:     updated.avatarColor,
      bio:             updated.bio,
      hideOnline:      updated.hideOnline,
      hideLastSeen:    updated.hideLastSeen,
      hideReadReceipt: updated.hideReadReceipt,
      isPrivate:       updated.isPrivate,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
});

// ── PATCH /api/users/privacy — cambiar perfil público/privado ─────────────────
router.patch('/privacy', protect, async (req, res) => {
  try {
    const { isPrivate } = req.body;
    if (typeof isPrivate !== 'boolean')
      return res.status(400).json({ message: 'isPrivate debe ser true o false' });

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { isPrivate } },
      { new: true, select: '-password' }
    );

    // Notificar al propio usuario en tiempo real para actualizar su contexto
    const io          = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    if (io && userSockets) {
      const socketId = userSockets.get(req.user._id.toString());
      if (socketId) {
        io.to(socketId).emit('user:privacy_changed', {
          userId:    updated._id,
          isPrivate: updated.isPrivate,
        });
      }
    }

    res.json({ isPrivate: updated.isPrivate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;