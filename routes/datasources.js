const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documentation/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.md', '.txt', '.docx'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get data source connection status
router.get('/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);

    res.json(user.dataSources || {
      documentation: { connected: false },
      slack: { connected: false },
      googleSheets: { connected: false },
      notion: { connected: false },
      confluence: { connected: false }
    });
  } catch (error) {
    console.error('Error getting data source status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Documentation upload endpoint
router.post('/documentation/upload', upload.array('files', 10), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { url, category, tags } = req.body;
    const files = req.files || [];

    // Store documentation metadata
    await authService.updateDataSource(user.id, 'documentation', {
      files: files.map(f => ({ filename: f.filename, originalName: f.originalname, path: f.path })),
      url,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      uploadedAt: new Date().toISOString()
    });

    res.json({ success: true, filesUploaded: files.length });
  } catch (error) {
    console.error('Documentation upload error:', error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;