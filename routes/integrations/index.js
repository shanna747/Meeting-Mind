const express = require('express');
const router = express.Router();
const meetingPlatformService = require('../../services/meetingPlatformService');

// Import platform-specific routers
const zoomRouter = require('./zoom');
const teamsRouter = require('./teams');
const googleMeetRouter = require('./googleMeet');

// Mount platform routers
router.use('/zoom', zoomRouter);
router.use('/teams', teamsRouter);
router.use('/google-meet', googleMeetRouter);

// Get all platform statuses
router.get('/status', (req, res) => {
  try {
    const status = meetingPlatformService.getPlatformStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting platform status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all active meetings across all platforms
router.get('/meetings/active', (req, res) => {
  try {
    const meetings = meetingPlatformService.getActiveMeetings();
    res.json({ meetings });
  } catch (error) {
    console.error('Error getting active meetings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generic transcript ingestion endpoint (for custom integrations)
router.post('/transcript', async (req, res) => {
  try {
    const { platform, meetingId, text, speaker, timestamp } = req.body;

    if (!platform || !meetingId || !text) {
      return res.status(400).json({
        error: 'Missing required fields: platform, meetingId, text'
      });
    }

    const validPlatforms = ['zoom', 'teams', 'googleMeet', 'custom'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
      });
    }

    await meetingPlatformService.processTranscript(platform, meetingId, {
      text,
      speaker: speaker || 'Unknown',
      timestamp: timestamp || Date.now()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Generic transcript error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check for integrations
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platforms: meetingPlatformService.getPlatformStatus()
  });
});

module.exports = router;