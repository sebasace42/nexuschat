const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'Todos los campos son requeridos' });
  try {
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(400).json({
        message: exists.email === email
          ? 'El email ya está registrado'
          : 'El nombre de usuario ya existe',
      });
    const user = await User.create({ username, email, password });
    res.status(201).json({
      _id: user._id, username: user.username,
      email: user.email, avatarColor: user.avatarColor,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email y contraseña requeridos' });
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Credenciales inválidas' });
    res.json({
      _id: user._id, username: user.username,
      email: user.email, avatarColor: user.avatarColor,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({
    _id:             req.user._id,
    username:        req.user.username,
    email:           req.user.email,
    avatarColor:     req.user.avatarColor,
    bio:             req.user.bio ?? '',
    hideOnline:      req.user.hideOnline      ?? false,
    hideLastSeen:    req.user.hideLastSeen    ?? false,
    hideReadReceipt: req.user.hideReadReceipt ?? false,
  });
});

module.exports = router;