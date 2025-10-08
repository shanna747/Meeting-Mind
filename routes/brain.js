const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// Get brain data for current user
router.get('/data', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);

    res.json({
      brainData: user.brainData || [],
      stats: {
        totalItems: user.brainData ? user.brainData.length : 0,
        topics: user.brainData ? [...new Set(user.brainData.map(item => item.category || 'General'))].length : 0,
        sources: user.brainData ? [...new Set(user.brainData.map(item => item.source))].length : 0
      }
    });
  } catch (error) {
    console.error('Error getting brain data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single brain item
router.get('/item/:itemId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { itemId } = req.params;

    const item = user.brainData?.find(item => item.id === itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Error getting brain item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete brain item
router.delete('/item/:itemId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { itemId } = req.params;

    await authService.deleteBrainItem(user.id, itemId);

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting brain item:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
