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

    // Get existing documentation data
    const existingDocs = user.dataSources?.documentation || {};
    const existingFiles = existingDocs.files || [];

    // Append new files to existing files
    const newFiles = files.map(f => ({
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      filename: f.filename,
      originalName: f.originalname,
      path: f.path,
      size: f.size,
      uploadedAt: new Date().toISOString(),
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      status: 'active'
    }));

    // Store documentation metadata with appended files
    await authService.updateDataSource(user.id, 'documentation', {
      files: [...existingFiles, ...newFiles],
      url,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      lastUploadedAt: new Date().toISOString()
    });

    res.json({ success: true, filesUploaded: files.length, totalFiles: existingFiles.length + files.length });
  } catch (error) {
    console.error('Documentation upload error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get documents for Knowledge Hub
router.get('/documents', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const docs = user.dataSources?.documentation || {};
    const files = docs.files || [];

    res.json({ documents: files });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get document content by ID
router.get('/documents/:docId/content', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { docId } = req.params;
    const docs = user.dataSources?.documentation || {};
    const files = docs.files || [];

    const doc = files.find(f => f.id === docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // If content is already stored, return it
    if (doc.content) {
      return res.json({ content: doc.content });
    }

    // Otherwise, try to read from file
    const fs = require('fs').promises;
    const path = require('path');

    // Check file extension to determine if it's a text file
    const ext = path.extname(doc.originalName || doc.filename || '').toLowerCase();
    const textExtensions = ['.txt', '.md', '.markdown', '.json', '.xml', '.csv', '.log'];

    if (!textExtensions.includes(ext)) {
      return res.json({
        content: `[${ext.toUpperCase() || 'Binary'} file - Cannot display binary content]\n\nThis is a ${ext || 'binary'} file. To edit the content:\n1. Download the original file\n2. Edit it with appropriate software (e.g., Microsoft Word for .docx)\n3. Re-upload the edited version\n\nFile: ${doc.originalName || doc.filename}\nSize: ${(doc.size / 1024).toFixed(2)} KB`,
        isBinary: true
      });
    }

    try {
      const content = await fs.readFile(doc.path, 'utf-8');
      res.json({ content, isBinary: false });
    } catch (err) {
      res.json({
        content: '[Error reading file - file may be corrupted or inaccessible]',
        isBinary: false
      });
    }
  } catch (error) {
    console.error('Error fetching document content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Archive document
router.post('/documents/:docId/archive', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { docId } = req.params;
    const docs = user.dataSources?.documentation || {};
    const files = docs.files || [];

    const updatedFiles = files.map(f =>
      f.id === docId ? { ...f, status: 'archived', archivedAt: new Date().toISOString() } : f
    );

    await authService.updateDataSource(user.id, 'documentation', {
      ...docs,
      files: updatedFiles
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unarchive document
router.post('/documents/:docId/unarchive', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { docId } = req.params;
    const docs = user.dataSources?.documentation || {};
    const files = docs.files || [];

    const updatedFiles = files.map(f =>
      f.id === docId ? { ...f, status: 'active', archivedAt: undefined } : f
    );

    await authService.updateDataSource(user.id, 'documentation', {
      ...docs,
      files: updatedFiles
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error unarchiving document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update document
router.put('/documents/:docId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { docId } = req.params;
    const { title, category, tags, status, content } = req.body;
    const docs = user.dataSources?.documentation || {};
    const files = docs.files || [];

    const updatedFiles = files.map(f => {
      if (f.id === docId) {
        return {
          ...f,
          originalName: title || f.originalName,
          category: category || f.category,
          tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : f.tags,
          status: status || f.status,
          content: content !== undefined ? content : f.content,
          updatedAt: new Date().toISOString()
        };
      }
      return f;
    });

    await authService.updateDataSource(user.id, 'documentation', {
      ...docs,
      files: updatedFiles
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/documents/:docId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { docId } = req.params;
    const docs = user.dataSources?.documentation || {};
    const files = docs.files || [];

    const updatedFiles = files.filter(f => f.id !== docId);

    await authService.updateDataSource(user.id, 'documentation', {
      ...docs,
      files: updatedFiles
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;