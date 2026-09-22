const express      = require('express');
const Channel      = require('../models/Channel');
const ChannelPost  = require('../models/ChannelPost');
const { protect }  = require('../middleware/auth');
const { upload, cloudinary } = require('../config/cloudinary');

const router = express.Router();

// ═════════════════════════════════════════════════════════════════════
// GET /api/channels — Descubrir todos los canales públicos
// ═════════════════════════════════════════════════════════════════════
router.get('/', protect, async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? { $text: { $search: search } }
      : {};

    const channels = await Channel.find(query)
      .populate('owner', 'username avatarColor avatarUrl')
      .sort({ createdAt: -1 });

    res.json(channels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// GET /api/channels/mine — Canales que soy dueño o sigo
// (va ANTES de /:id para que Express no confunda "mine" con un id)
// ═════════════════════════════════════════════════════════════════════
router.get('/mine', protect, async (req, res) => {
  try {
    const channels = await Channel.find({
      $or: [{ owner: req.user._id }, { followers: req.user._id }],
    })
      .populate('owner', 'username avatarColor avatarUrl')
      .sort({ lastPostAt: -1, createdAt: -1 });

    res.json(channels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// POST /api/channels — Crear canal (quien lo crea queda como dueño
// y automáticamente como seguidor)
// ═════════════════════════════════════════════════════════════════════
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, avatarColor } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'El nombre del canal es requerido' });
    }

    const channel = await Channel.create({
      name:        name.trim(),
      description: description?.trim() || '',
      avatarColor: avatarColor || '#7c6cf6',
      owner:       req.user._id,
      followers:   [req.user._id],
    });

    const populated = await channel.populate('owner', 'username avatarColor avatarUrl');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// GET /api/channels/:id — Detalle de un canal
// ═════════════════════════════════════════════════════════════════════
router.get('/:id', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('owner', 'username avatarColor avatarUrl');

    if (!channel) {
      return res.status(404).json({ message: 'Canal no encontrado' });
    }

    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// GET /api/channels/:id/posts — Historial de publicaciones, paginado
// ═════════════════════════════════════════════════════════════════════
router.get('/:id/posts', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const total = await ChannelPost.countDocuments({ channel: id });

    const posts = await ChannelPost.find({ channel: id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reactions.user', 'username');

    posts.reverse();

    res.json({
      posts,
      hasMore: page * limit < total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// POST /api/channels/:id/follow — Seguir / dejar de seguir (toggle)
// El dueño no puede dejar de seguir su propio canal.
// ═════════════════════════════════════════════════════════════════════
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Canal no encontrado' });
    }

    const userId = req.user._id.toString();
    const isFollowing = channel.followers.map(String).includes(userId);

    if (isFollowing) {
      if (channel.owner.toString() === userId) {
        return res.status(400).json({ message: 'No puedes dejar de seguir tu propio canal' });
      }
      channel.followers = channel.followers.filter((f) => f.toString() !== userId);
    } else {
      channel.followers.push(req.user._id);
    }

    await channel.save();

    res.json({
      ok: true,
      following: !isFollowing,
      followersCount: channel.followers.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// POST /api/channels/:id/posts — Publicar (solo el dueño)
// ═════════════════════════════════════════════════════════════════════
router.post('/:id/posts', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Canal no encontrado' });
    }
    if (channel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Solo el dueño puede publicar en este canal' });
    }

    const { text, mediaUrl, mediaType, mediaName, mediaSize, mediaMimeType, mediaPublicId } = req.body;

    if (!text?.trim() && !mediaUrl) {
      return res.status(400).json({ message: 'La publicación necesita texto o contenido multimedia' });
    }

    const post = await ChannelPost.create({
      channel:       channel._id,
      text:          text?.trim() || '',
      mediaUrl:      mediaUrl      || null,
      mediaType:     mediaType     || null,
      mediaName:     mediaName     || null,
      mediaSize:     mediaSize     || null,
      mediaMimeType: mediaMimeType || null,
      mediaPublicId: mediaPublicId || null,
    });

    channel.lastPostAt = new Date();
    await channel.save();

    // Notificar en tiempo real a todos los seguidores conectados
    // (se unen a la sala `channel:<id>` vía el evento de socket
    // 'channels:join', igual que 'conversations:join').
    const io = req.app.get('io');
    io.to(`channel:${channel._id}`).emit('channel:post:new', {
      channelId: channel._id.toString(),
      post,
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// DELETE /api/channels/:id/posts/:postId — Borrar publicación (dueño)
// ═════════════════════════════════════════════════════════════════════
router.delete('/:id/posts/:postId', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Canal no encontrado' });
    }
    if (channel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const deleted = await ChannelPost.findOneAndDelete({
      _id: req.params.postId,
      channel: channel._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    // Limpieza opcional de media en Cloudinary
    if (deleted.mediaPublicId) {
      try {
        const resourceType = deleted.mediaType === 'image' ? 'image'
          : deleted.mediaType === 'document' ? 'raw'
          : 'video';
        await cloudinary.uploader.destroy(deleted.mediaPublicId, { resource_type: resourceType });
      } catch (e) {
        console.error('Error eliminando media de Cloudinary:', e);
      }
    }

    const io = req.app.get('io');
    io.to(`channel:${channel._id}`).emit('channel:post:deleted', {
      channelId: channel._id.toString(),
      postId: req.params.postId,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// PATCH /api/channels/:id/avatar — Cambiar foto de perfil (solo dueño)
// ═════════════════════════════════════════════════════════════════════
router.patch('/:id/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Canal no encontrado' });
    }
    if (channel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Solo el dueño puede cambiar la foto del canal' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ninguna imagen' });
    }
    if (!req.file.mimetype.startsWith('image/')) {
      // El archivo ya se subió a Cloudinary vía el middleware; lo limpiamos
      if (req.file.filename) {
        cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      }
      return res.status(400).json({ message: 'El archivo debe ser una imagen' });
    }

    const oldPublicId = channel.avatarPublicId;

    channel.avatarUrl      = req.file.path;      // URL de Cloudinary
    channel.avatarPublicId = req.file.filename;   // public_id en Cloudinary
    await channel.save();

    // Borrar la foto anterior en Cloudinary, si había una
    if (oldPublicId) {
      cloudinary.uploader.destroy(oldPublicId).catch((e) =>
        console.error('Error borrando foto anterior del canal en Cloudinary:', e)
      );
    }

    const populated = await channel.populate('owner', 'username avatarColor avatarUrl');

    // Avisar en tiempo real a quien tenga el canal abierto o listado
    const io = req.app.get('io');
    io.emit('channel:updated', { channel: populated });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════
// DELETE /api/channels/:id — Borrar el canal completo (solo dueño)
// ═════════════════════════════════════════════════════════════════════
router.delete('/:id', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Canal no encontrado' });
    }
    if (channel.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    await ChannelPost.deleteMany({ channel: channel._id });
    await Channel.findByIdAndDelete(channel._id);

    if (channel.avatarPublicId) {
      cloudinary.uploader.destroy(channel.avatarPublicId).catch((e) =>
        console.error('Error borrando foto del canal en Cloudinary:', e)
      );
    }

    const io = req.app.get('io');
    io.emit('channel:deleted', { channelId: channel._id.toString() });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;