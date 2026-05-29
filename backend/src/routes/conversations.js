const express      = require('express');
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const { protect }  = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  const { recipientId } = req.body;
  if (!recipientId)
    return res.status(400).json({ message: 'recipientId es requerido' });
  try {
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    })
      .populate('participants', '-password')
      .populate('lastMessage');
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId], isGroup: false,
      });
      conversation = await conversation.populate('participants', '-password');
    }
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/messages', protect, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const total = await Message.countDocuments({ conversation: req.params.id });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'username avatarColor')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    await Message.updateMany(
      { conversation: req.params.id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    await Conversation.findByIdAndUpdate(req.params.id, {
      $set: { [`unreadCount.${req.user._id}`]: 0 },
    });

    res.json({
      messages,
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;