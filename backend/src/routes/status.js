const express  = require('express');
const Status   = require('../models/Status');
const { protect } = require('../middleware/auth');
const { upload, cloudinary } = require('../config/cloudinary');

const router = express.Router();

// ── GET /api/status
// Devuelve los estados de los CONTACTOS del usuario (amigos aceptados)
// + los propios. Ya NO usa participantes de conversaciones —
// solo los amigos aceptados en Friendship pueden ver el estado.
router.get('/', protect, async (req, res) => {
  try {
    const Friendship = require('../models/Friendship');

    // Obtener IDs de contactos aceptados
    const friendships = await Friendship.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    });

    const contactIds = new Set();
    friendships.forEach((f) => {
      const other = f.requester.toString() === req.user._id.toString()
        ? f.recipient
        : f.requester;
      contactIds.add(other.toString());
    });

    // Incluir al propio usuario para ver sus estados
    contactIds.add(req.user._id.toString());

    const statuses = await Status.find({
      user:      { $in: Array.from(contactIds) },
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'username avatarColor')
      .sort({ createdAt: -1 });

    // Agrupar por usuario
    const grouped = {};
    statuses.forEach((s) => {
      const uid = s.user._id.toString();
      if (!grouped[uid]) {
        grouped[uid] = { user: s.user, statuses: [], hasNew: false };
      }
      grouped[uid].statuses.push(s);
      const seen = s.views.some(
        (v) => v.user.toString() === req.user._id.toString()
      );
      if (!seen) grouped[uid].hasNew = true;
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/status/text ─────────────────────────────────────────────────────
router.post('/text', protect, async (req, res) => {
  try {
    const { text, bgColor } = req.body;
    if (!text?.trim())
      return res.status(400).json({ message: 'El texto es requerido' });

    const status = await Status.create({
      user:    req.user._id,
      type:    'text',
      text:    text.trim(),
      bgColor: bgColor || '#5b4fcf',
    });

    const populated = await status.populate('user', 'username avatarColor');

    // Notificar a contactos en tiempo real
    _emitToFriends(req, populated);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/status/media ────────────────────────────────────────────────────
router.post('/media', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'Archivo requerido' });

    const type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const status = await Status.create({
      user:          req.user._id,
      type,
      mediaUrl:      req.file.path,
      mediaPublicId: req.file.filename,
      text:          req.body.text?.trim() || '',
    });

    const populated = await status.populate('user', 'username avatarColor');

    // Notificar a contactos en tiempo real
    _emitToFriends(req, populated);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/status/:id/view ─────────────────────────────────────────────────
router.post('/:id/view', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ message: 'Estado no encontrado' });

    const alreadySeen = status.views.some(
      (v) => v.user.toString() === req.user._id.toString()
    );
    if (!alreadySeen) {
      status.views.push({ user: req.user._id });
      await status.save();
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/status/:id ────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ message: 'Estado no encontrado' });
    if (status.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'No autorizado' });

    if (status.mediaPublicId) {
      const resourceType = status.type === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(status.mediaPublicId, {
        resource_type: resourceType,
      }).catch(console.error);
    }

    await Status.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Helper interno: emitir status:new a todos los contactos del usuario ───────
async function _emitToFriends(req, status) {
  try {
    const io          = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    if (!io || !userSockets) return;

    const Friendship = require('../models/Friendship');
    const friendships = await Friendship.find({
      $or: [{ requester: status.user._id }, { recipient: status.user._id }],
      status: 'accepted',
    });

    friendships.forEach((f) => {
      const otherId = f.requester.toString() === status.user._id.toString()
        ? f.recipient.toString()
        : f.requester.toString();
      const socketId = userSockets.get(otherId);
      if (socketId) io.to(socketId).emit('status:new', { status });
    });
  } catch (err) {
    console.error('_emitToFriends error:', err);
  }
}

module.exports = router;