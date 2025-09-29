const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, company, subscription } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, password'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }

    const result = await authService.register({
      name,
      email,
      password,
      company,
      subscription: subscription || 'free'
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email, password'
      });
    }

    const result = await authService.login(email, password);

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);

    res.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await authService.logout(token);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Update subscription
router.put('/subscription', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { subscription } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    if (!subscription || !['free', 'pro', 'business'].includes(subscription)) {
      return res.status(400).json({ error: 'Invalid subscription type' });
    }

    const currentUser = await authService.verifyToken(token);
    const updatedUser = await authService.updateSubscription(
      currentUser.id,
      subscription
    );

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Subscription update error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;