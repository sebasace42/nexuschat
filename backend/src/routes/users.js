const express = require('express');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload, cloudinary } = require('../config/cloudinary');

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
      avatarUrl:       updated.avatarUrl,
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

// ── PUT /api/users/avatar — subir/cambiar foto de perfil ──────────────────────
router.put('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No se recibió ninguna imagen' });

    if (!req.file.mimetype.startsWith('image/'))
      return res.status(400).json({ message: 'El archivo debe ser una imagen' });

    const user = await User.findById(req.user._id);

    // Borrar la foto anterior de Cloudinary si existía, para no acumular basura
    if (user.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      } catch (err) {
        console.error('No se pudo borrar el avatar anterior:', err.message);
      }
    }

    user.avatarUrl      = req.file.path;     // URL de Cloudinary
    user.avatarPublicId = req.file.filename; // public_id en Cloudinary
    await user.save();

    res.json({
      _id:             user._id,
      username:        user.username,
      email:           user.email,
      avatarColor:     user.avatarColor,
      avatarUrl:       user.avatarUrl,
      bio:             user.bio,
      hideOnline:      user.hideOnline,
      hideLastSeen:    user.hideLastSeen,
      hideReadReceipt: user.hideReadReceipt,
      isPrivate:       user.isPrivate,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error del servidor' });
  }
});

// ── DELETE /api/users/avatar — quitar foto y volver al avatar de color ────────
router.delete('/avatar', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      } catch (err) {
        console.error('No se pudo borrar el avatar en Cloudinary:', err.message);
      }
    }

    user.avatarUrl      = null;
    user.avatarPublicId = null;
    await user.save();

    res.json({ avatarUrl: null });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error del servidor' });
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

// ═════════════════════════════════════════════════════════════════════
// POST /api/users/:id/block — bloquear a un usuario
// ═════════════════════════════════════════════════════════════════════
router.post('/:id/block', protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes bloquearte a ti mismo' });
    }

    const targetExists = await User.exists({ _id: id });
    if (!targetExists) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: id },
    });

    res.json({ blocked: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// POST /api/users/:id/unblock — desbloquear a un usuario
// ═════════════════════════════════════════════════════════════════════
router.post('/:id/unblock', protect, async (req, res) => {
  try {
    const { id } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: id },
    });

    res.json({ blocked: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// GET /api/users/:id/block-status — ¿yo bloqueé a este usuario?
// ═════════════════════════════════════════════════════════════════════
router.get('/:id/block-status', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('blockedUsers');
    const blocked = me.blockedUsers.some(
      (u) => u.toString() === req.params.id
    );
    res.json({ blocked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// GET /api/users/blocked — lista completa de usuarios bloqueados
// (la usa la pantalla de Privacidad)
// ═════════════════════════════════════════════════════════════════════
router.get('/blocked', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate('blockedUsers', 'username avatarColor avatarUrl');
    res.json(me.blockedUsers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;