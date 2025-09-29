const express = require('express');
const router = express.Router();
const companyBrainService = require('../services/companyBrainService');

// Ingest company document
router.post('/ingest', async (req, res) => {
  try {
    const { content, metadata } = req.body;

    if (!content || !metadata?.documentId) {
      return res.status(400).json({
        error: 'Missing required fields: content, metadata.documentId'
      });
    }

    const result = await companyBrainService.ingestDocument({
      content,
      metadata
    });

    res.json(result);
  } catch (error) {
    console.error('Error ingesting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query company knowledge base
router.post('/query', async (req, res) => {
  try {
    const { question, options } = req.body;

    if (!question) {
      return res.status(400).json({
        error: 'Missing required field: question'
      });
    }

    const result = await companyBrainService.query(question, options || {});

    res.json(result);
  } catch (error) {
    console.error('Error querying company brain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch relevant context for meeting
router.post('/context', async (req, res) => {
  try {
    const { meetingContext, topK } = req.body;

    if (!meetingContext) {
      return res.status(400).json({
        error: 'Missing required field: meetingContext'
      });
    }

    const result = await companyBrainService.fetchRelevantContext(
      meetingContext,
      topK || 3
    );

    res.json(result);
  } catch (error) {
    console.error('Error fetching relevant context:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get related documents
router.get('/related/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { topK } = req.query;

    const result = await companyBrainService.getRelatedDocuments(
      documentId,
      parseInt(topK) || 5
    );

    res.json({ relatedDocuments: result });
  } catch (error) {
    console.error('Error getting related documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    const result = await companyBrainService.deleteDocument(documentId);

    res.json(result);
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get knowledge base stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await companyBrainService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;