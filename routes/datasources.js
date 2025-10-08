const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const fileStorage = require('../services/fileStorage');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// Configure multer for file uploads
// Use memory storage for S3, disk storage for local
const storage = fileStorage.useS3
  ? multer.memoryStorage()
  : multer.diskStorage({
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

    // Check if documentation has actual files uploaded
    const docFiles = user.dataSources?.documentation?.files || [];
    const hasDocuments = docFiles.length > 0;

    // Build response with actual connection status based on uploaded documents
    const status = {
      documentation: {
        connected: hasDocuments,
        files: docFiles,
        ...(user.dataSources?.documentation || {})
      },
      slack: user.dataSources?.slack || { connected: false },
      googleSheets: user.dataSources?.googleSheets || { connected: false },
      notion: user.dataSources?.notion || { connected: false },
      confluence: user.dataSources?.confluence || { connected: false }
    };

    res.json(status);
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

    // Upload files using fileStorage service
    const newFiles = await Promise.all(
      files.map(async (f) => {
        const uploadedFile = await fileStorage.uploadFile(f, user.id, 'documentation');
        return {
          ...uploadedFile,
          category,
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
          status: 'active'
        };
      })
    );

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

    // Check file extension to determine file type
    const ext = path.extname(doc.originalName || doc.filename || '').toLowerCase();
    const textExtensions = ['.txt', '.md', '.markdown', '.json', '.xml', '.csv', '.log'];

    try {
      // Handle PDF files
      if (ext === '.pdf') {
        let dataBuffer;
        if (fileStorage.useS3) {
          // Get file from S3
          const command = new (require('@aws-sdk/client-s3').GetObjectCommand)({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: doc.path
          });
          const response = await fileStorage.s3Client.send(command);
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(chunk);
          }
          dataBuffer = Buffer.concat(chunks);
        } else {
          // Get file from local storage
          dataBuffer = await fs.readFile(doc.path);
        }
        const pdfData = await pdfParse(dataBuffer);
        const extractedText = pdfData.text || '[No text could be extracted from PDF]';
        return res.json({ content: extractedText, isBinary: false });
      }

      // Handle text files
      if (textExtensions.includes(ext)) {
        const content = await fileStorage.getFileContent(doc.path);
        return res.json({ content, isBinary: false });
      }

      // Handle other binary files (DOCX, etc.)
      return res.json({
        content: `[${ext.toUpperCase() || 'Binary'} file - Cannot display binary content]\n\nThis is a ${ext || 'binary'} file. To edit the content:\n1. Download the original file\n2. Edit it with appropriate software (e.g., Microsoft Word for .docx)\n3. Re-upload the edited version\n\nFile: ${doc.originalName || doc.filename}\nSize: ${(doc.size / 1024).toFixed(2)} KB`,
        isBinary: true
      });
    } catch (err) {
      console.error('Error reading file content:', err);
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

    // Find the document to delete
    const docToDelete = files.find(f => f.id === docId);
    if (docToDelete && docToDelete.path) {
      // Delete file from S3 or local storage
      await fileStorage.deleteFile(docToDelete.path);
    }

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