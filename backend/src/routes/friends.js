const express    = require('express');
const User       = require('../models/User');
const Friendship = require('../models/Friendship');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── Helper: emitir evento solo al socket privado del usuario ──────────────────
const emitTo = (req, userId, event, payload) => {
  const io          = req.app.get('io');
  const userSockets = req.app.get('userSockets');
  if (!io || !userSockets) return;
  const socketId = userSockets.get(userId.toString());
  if (socketId) io.to(socketId).emit(event, payload);
};

// ── GET /api/friends ──────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    })
      .populate('requester', 'username avatarColor isPrivate')
      .populate('recipient', 'username avatarColor isPrivate');

    const friends = friendships.map((f) => {
      const isRequester = f.requester._id.toString() === req.user._id.toString();
      return isRequester ? f.recipient : f.requester;
    });

    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/friends/requests — solicitudes recibidas pendientes ──────────────
router.get('/requests', protect, async (req, res) => {
  try {
    const pending = await Friendship.find({
      recipient: req.user._id,
      status:    'pending',
    }).populate('requester', 'username avatarColor isPrivate');

    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/friends/sent — solicitudes enviadas pendientes ───────────────────
router.get('/sent', protect, async (req, res) => {
  try {
    const sent = await Friendship.find({
      requester: req.user._id,
      status:    'pending',
    }).populate('recipient', 'username avatarColor isPrivate');

    res.json(sent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/friends/search?q= ────────────────────────────────────────────────
router.get('/search', protect, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2)
      return res.status(400).json({ message: 'Escribe al menos 2 caracteres' });

    const users = await User.find({
      _id:      { $ne: req.user._id },
      username: { $regex: q, $options: 'i' },
    })
      .select('username avatarColor isPrivate')
      .limit(20);

    if (!users.length) return res.json([]);

    const userIds = users.map((u) => u._id);
    const existingFriendships = await Friendship.find({
      $or: [
        { requester: req.user._id, recipient: { $in: userIds } },
        { requester: { $in: userIds }, recipient: req.user._id },
      ],
    });

    const result = users.map((u) => {
      const friendship = existingFriendships.find(
        (f) =>
          (f.requester.toString() === req.user._id.toString() &&
           f.recipient.toString() === u._id.toString()) ||
          (f.recipient.toString() === req.user._id.toString() &&
           f.requester.toString() === u._id.toString())
      );

      const friendStatus = !friendship
        ? 'none'
        : friendship.status === 'accepted'
        ? 'accepted'
        : friendship.requester.toString() === req.user._id.toString()
        ? 'pending_sent'
        : 'pending_received';

      return {
        _id:          u._id,
        username:     u.username,
        avatarColor:  u.avatarColor,
        isPrivate:    u.isPrivate,
        friendStatus,
        friendshipId: friendship?._id,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/friends/request ─────────────────────────────────────────────────
// Perfil PÚBLICO  → se acepta automáticamente (como seguir en Instagram)
// Perfil PRIVADO  → queda pendiente, el usuario decide
router.post('/request', protect, async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId)
      return res.status(400).json({ message: 'recipientId es requerido' });
    if (recipientId === req.user._id.toString())
      return res.status(400).json({ message: 'No puedes enviarte una solicitud a ti mismo' });

    const recipient = await User.findById(recipientId)
      .select('username avatarColor isPrivate');
    if (!recipient)
      return res.status(404).json({ message: 'Usuario no encontrado' });

    // Verificar relación existente
    let existing = await Friendship.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId,  recipient: req.user._id },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted')
        return res.status(400).json({ message: 'Ya son contactos' });
      if (existing.status === 'pending')
        return res.status(400).json({ message: 'Ya existe una solicitud pendiente' });
      // Rechazada previamente → reenviar
      existing.status    = 'pending';
      existing.requester = req.user._id;
      existing.recipient = recipientId;
      await existing.save();
    }

    // Lógica público vs privado
    const autoAccept = !recipient.isPrivate; // público = acepta automático
    const status     = autoAccept ? 'accepted' : 'pending';

    let friendship;
    if (existing) {
      existing.status = status;
      await existing.save();
      friendship = existing;
    } else {
      friendship = await Friendship.create({
        requester: req.user._id,
        recipient: recipientId,
        status,
      });
    }

    await friendship.populate('requester', 'username avatarColor isPrivate');
    await friendship.populate('recipient', 'username avatarColor isPrivate');

    if (autoAccept) {
      // Notificar a ambos: ya son contactos
      emitTo(req, recipientId,             'friend:accepted', { friendship });
      emitTo(req, req.user._id.toString(), 'friend:accepted', { friendship });
    } else {
      // Solo notificar al receptor: tiene solicitud pendiente
      emitTo(req, recipientId, 'friend:request', { friendship });
    }

    res.status(autoAccept ? 200 : 201).json({
      friendship,
      autoAccepted: autoAccept,
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: 'Ya existe una relación entre estos usuarios' });
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/friends/accept/:id ─────────────────────────────────────────────
router.post('/accept/:id', protect, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.id)
      .populate('requester', 'username avatarColor isPrivate')
      .populate('recipient', 'username avatarColor isPrivate');

    if (!friendship)
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (friendship.recipient._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'No autorizado' });
    if (friendship.status !== 'pending')
      return res.status(400).json({ message: 'La solicitud ya fue procesada' });

    friendship.status = 'accepted';
    await friendship.save();

    emitTo(req, friendship.requester._id, 'friend:accepted', { friendship });
    emitTo(req, req.user._id,             'friend:accepted', { friendship });

    res.json(friendship);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/friends/reject/:id ─────────────────────────────────────────────
router.post('/reject/:id', protect, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.id);
    if (!friendship)
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (friendship.recipient.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'No autorizado' });

    await Friendship.findByIdAndDelete(req.params.id);

    emitTo(req, friendship.requester, 'friend:rejected', {
      friendshipId: req.params.id,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/friends/:id ───────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    let friendship = await Friendship.findOne({
      _id: req.params.id,
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    });

    if (!friendship) {
      friendship = await Friendship.findOne({
        $or: [
          { requester: req.user._id, recipient: req.params.id },
          { requester: req.params.id, recipient: req.user._id },
        ],
      });
    }

    if (!friendship)
      return res.status(404).json({ message: 'Relación no encontrada' });

    const otherUserId = friendship.requester.toString() === req.user._id.toString()
      ? friendship.recipient
      : friendship.requester;

    await Friendship.findByIdAndDelete(friendship._id);

    emitTo(req, otherUserId, 'friend:removed', { userId: req.user._id });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;