const express = require('express');
const router = express.Router();
const meetingPlatformService = require('../../services/meetingPlatformService');
const axios = require('axios');

// Microsoft Teams webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const { type, value } = req.body;

    // Handle webhook validation
    if (type === 'validationToken') {
      return res.status(200).send(value);
    }

    // Verify signature if provided
    const signature = req.headers['x-ms-signature'];
    if (signature) {
      const isValid = meetingPlatformService.verifyTeamsWebhook(
        req.body,
        signature
      );

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    // Handle different Teams events
    switch (type) {
      case 'CallRecording':
        await handleCallRecording(value);
        break;

      case 'CallTranscript':
        await handleCallTranscript(value);
        break;

      case 'MeetingStarted':
        await handleMeetingStarted(value);
        break;

      case 'MeetingEnded':
        await handleMeetingEnded(value);
        break;

      default:
        console.log('Unhandled Teams event:', type);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Teams webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Receive real-time transcript from Teams
router.post('/transcript', async (req, res) => {
  try {
    const { meetingId, content, speaker, createdDateTime } = req.body;

    if (!meetingId || !content) {
      return res.status(400).json({
        error: 'Missing required fields: meetingId, content'
      });
    }

    const formattedData = meetingPlatformService.formatTranscript('teams', {
      text: content,
      speaker,
      timestamp: createdDateTime
    });

    await meetingPlatformService.processTranscript(
      'teams',
      meetingId,
      formattedData
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Teams transcript error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start Teams meeting session
router.post('/meeting/start', async (req, res) => {
  try {
    const { meetingId, title, participants, organizer } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'Missing meetingId' });
    }

    const result = meetingPlatformService.registerMeeting({
      meetingId,
      platform: 'teams',
      title: title || 'Teams Meeting',
      participants: participants || [],
      organizer
    });

    res.json(result);
  } catch (error) {
    console.error('Teams meeting start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// End Teams meeting session
router.post('/meeting/end', async (req, res) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'Missing meetingId' });
    }

    const result = meetingPlatformService.endMeeting(meetingId);
    res.json(result);
  } catch (error) {
    console.error('Teams meeting end error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Teams meeting details
router.get('/meeting/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = meetingPlatformService.getMeeting(meetingId);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({ meeting });
  } catch (error) {
    console.error('Teams meeting get error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OAuth callback for Teams authentication
router.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Exchange code for access token
    const tokenResponse = await getAccessToken(code);

    res.json({
      success: true,
      message: 'Teams integration authorized',
      expiresIn: tokenResponse.expires_in
    });
  } catch (error) {
    console.error('Teams auth callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function handleCallRecording(value) {
  console.log('Teams call recording event:', value);
  // Process recording if needed
}

async function handleCallTranscript(value) {
  const { callId, transcript } = value;

  if (callId && transcript) {
    // Process transcript
    const formattedData = meetingPlatformService.formatTranscript('teams', {
      text: transcript.content,
      speaker: transcript.speaker,
      timestamp: transcript.createdDateTime
    });

    await meetingPlatformService.processTranscript(
      'teams',
      callId,
      formattedData
    );
  }
}

async function handleMeetingStarted(value) {
  const { id, subject, organizer } = value;
  meetingPlatformService.registerMeeting({
    meetingId: id,
    platform: 'teams',
    title: subject,
    participants: [],
    organizer: organizer?.emailAddress
  });
}

async function handleMeetingEnded(value) {
  meetingPlatformService.endMeeting(value.id);
}

async function getAccessToken(code) {
  const config = meetingPlatformService.platformConfigs.teams;

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.TEAMS_REDIRECT_URI
  });

  const response = await axios.post(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data;
}

module.exports = router;