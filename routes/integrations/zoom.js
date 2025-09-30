const express = require('express');
const router = express.Router();
const meetingPlatformService = require('../../services/meetingPlatformService');
const authService = require('../../services/authService');

// Zoom configuration endpoint
router.post('/configure', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { accountId, clientId, clientSecret, webhookToken } = req.body;

    if (!accountId || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store Zoom configuration in user's integrations
    await authService.updateDataSource(user.id, 'zoom', {
      accountId,
      clientId,
      clientSecret,
      webhookToken,
      platform: 'zoom',
      configuredAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Zoom configured successfully' });
  } catch (error) {
    console.error('Zoom configuration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Zoom webhook verification endpoint
router.post('/webhook', async (req, res) => {
  try {
    const { event, payload } = req.body;
    const signature = req.headers['x-zm-signature'];
    const timestamp = req.headers['x-zm-request-timestamp'];

    // Verify webhook signature
    if (signature && timestamp) {
      const isValid = meetingPlatformService.verifyZoomWebhook(
        req.body,
        signature,
        timestamp
      );

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    // Handle different Zoom events
    switch (event) {
      case 'meeting.started':
        await handleMeetingStarted(payload);
        break;

      case 'meeting.ended':
        await handleMeetingEnded(payload);
        break;

      case 'recording.transcript_completed':
        await handleTranscriptCompleted(payload);
        break;

      case 'meeting.participant_joined':
        await handleParticipantJoined(payload);
        break;

      default:
        console.log('Unhandled Zoom event:', event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Zoom webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Receive real-time transcript chunks from Zoom
router.post('/transcript', async (req, res) => {
  try {
    const { meetingId, transcript, speaker, timestamp } = req.body;

    if (!meetingId || !transcript) {
      return res.status(400).json({
        error: 'Missing required fields: meetingId, transcript'
      });
    }

    const formattedData = meetingPlatformService.formatTranscript('zoom', {
      text: transcript,
      speaker,
      timestamp
    });

    await meetingPlatformService.processTranscript(
      'zoom',
      meetingId,
      formattedData
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Zoom transcript error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start Zoom meeting session
router.post('/meeting/start', async (req, res) => {
  try {
    const { meetingId, title, participants, hostId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'Missing meetingId' });
    }

    const result = meetingPlatformService.registerMeeting({
      meetingId,
      platform: 'zoom',
      title: title || 'Zoom Meeting',
      participants: participants || [],
      hostId
    });

    res.json(result);
  } catch (error) {
    console.error('Zoom meeting start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// End Zoom meeting session
router.post('/meeting/end', async (req, res) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'Missing meetingId' });
    }

    const result = meetingPlatformService.endMeeting(meetingId);
    res.json(result);
  } catch (error) {
    console.error('Zoom meeting end error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Zoom meeting details
router.get('/meeting/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = meetingPlatformService.getMeeting(meetingId);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({ meeting });
  } catch (error) {
    console.error('Zoom meeting get error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function handleMeetingStarted(payload) {
  const { object } = payload;
  meetingPlatformService.registerMeeting({
    meetingId: object.id,
    platform: 'zoom',
    title: object.topic,
    participants: [],
    startTime: object.start_time
  });
}

async function handleMeetingEnded(payload) {
  const { object } = payload;
  meetingPlatformService.endMeeting(object.id);
}

async function handleTranscriptCompleted(payload) {
  const { object } = payload;
  // Process full transcript if available
  console.log('Zoom transcript completed for meeting:', object.id);
}

async function handleParticipantJoined(payload) {
  const { object } = payload;
  const meeting = meetingPlatformService.getMeeting(object.id);
  if (meeting && object.participant) {
    meeting.participants.push({
      id: object.participant.user_id,
      name: object.participant.user_name,
      joinTime: object.participant.join_time
    });
  }
}

module.exports = router;