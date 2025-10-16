const express = require('express');
const router = express.Router();
const transcriptService = require('../services/transcriptService');

// Ingest transcript chunk
router.post('/chunk', async (req, res) => {
  try {
    const { text, timestamp, speaker, meetingId } = req.body;

    if (!text || !meetingId) {
      return res.status(400).json({
        error: 'Missing required fields: text, meetingId'
      });
    }

    const result = await transcriptService.ingestChunk({
      text,
      timestamp: timestamp || Date.now(),
      speaker: speaker || 'Unknown',
      meetingId
    });

    res.json(result);
  } catch (error) {
    console.error('Error ingesting transcript chunk:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ingest full transcript
router.post('/full', async (req, res) => {
  try {
    const { text, meetingId, metadata } = req.body;

    if (!text || !meetingId) {
      return res.status(400).json({
        error: 'Missing required fields: text, meetingId'
      });
    }

    const result = await transcriptService.ingestFullTranscript({
      text,
      meetingId,
      metadata
    });

    res.json(result);
  } catch (error) {
    console.error('Error ingesting full transcript:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current transcript
router.get('/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;
    const transcript = transcriptService.getCurrentTranscript(meetingId);
    res.json({ transcript });
  } catch (error) {
    console.error('Error getting transcript:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search transcript
router.post('/search', async (req, res) => {
  try {
    const { query, meetingId, topK } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }

    const results = await transcriptService.searchTranscript(
      query,
      meetingId,
      topK || 5
    );

    res.json({ results });
  } catch (error) {
    console.error('Error searching transcript:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear transcript
router.delete('/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;
    transcriptService.clearTranscript(meetingId);
    res.json({ success: true, message: 'Transcript cleared' });
  } catch (error) {
    console.error('Error clearing transcript:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;