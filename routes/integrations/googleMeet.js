const express = require('express');
const router = express.Router();
const meetingPlatformService = require('../../services/meetingPlatformService');
const axios = require('axios');

// Google Meet webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const { eventType, meeting, transcript } = req.body;

    // Handle different Google Meet events
    switch (eventType) {
      case 'meeting.started':
        await handleMeetingStarted(meeting);
        break;

      case 'meeting.ended':
        await handleMeetingEnded(meeting);
        break;

      case 'transcript.updated':
        await handleTranscriptUpdated(meeting?.id, transcript);
        break;

      case 'participant.joined':
        await handleParticipantJoined(meeting);
        break;

      default:
        console.log('Unhandled Google Meet event:', eventType);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Google Meet webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Receive real-time transcript from Google Meet
router.post('/transcript', async (req, res) => {
  try {
    const { meetingId, transcript, participant, timestamp } = req.body;

    if (!meetingId || !transcript) {
      return res.status(400).json({
        error: 'Missing required fields: meetingId, transcript'
      });
    }

    const formattedData = meetingPlatformService.formatTranscript('googleMeet', {
      text: transcript,
      speaker: participant?.name,
      timestamp
    });

    await meetingPlatformService.processTranscript(
      'googleMeet',
      meetingId,
      formattedData
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Google Meet transcript error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start Google Meet session
router.post('/meeting/start', async (req, res) => {
  try {
    const { meetingId, title, participants, organizerEmail } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'Missing meetingId' });
    }

    const result = meetingPlatformService.registerMeeting({
      meetingId,
      platform: 'googleMeet',
      title: title || 'Google Meet',
      participants: participants || [],
      organizerEmail
    });

    res.json(result);
  } catch (error) {
    console.error('Google Meet start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// End Google Meet session
router.post('/meeting/end', async (req, res) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'Missing meetingId' });
    }

    const result = meetingPlatformService.endMeeting(meetingId);
    res.json(result);
  } catch (error) {
    console.error('Google Meet end error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Google Meet details
router.get('/meeting/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = meetingPlatformService.getMeeting(meetingId);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({ meeting });
  } catch (error) {
    console.error('Google Meet get error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OAuth callback for Google authentication
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
      message: 'Google Meet integration authorized',
      expiresIn: tokenResponse.expires_in
    });
  } catch (error) {
    console.error('Google Meet auth callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get OAuth authorization URL
router.get('/auth/url', (req, res) => {
  try {
    const config = meetingPlatformService.platformConfigs.googleMeet;

    if (!config.clientId) {
      return res.status(400).json({
        error: 'Google Meet integration not configured'
      });
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/meetings.space.readonly'
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');

    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Google Meet auth URL error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function handleMeetingStarted(meeting) {
  if (!meeting) return;

  meetingPlatformService.registerMeeting({
    meetingId: meeting.id,
    platform: 'googleMeet',
    title: meeting.summary || 'Google Meet',
    participants: meeting.participants || [],
    startTime: meeting.startTime
  });
}

async function handleMeetingEnded(meeting) {
  if (!meeting?.id) return;
  meetingPlatformService.endMeeting(meeting.id);
}

async function handleTranscriptUpdated(meetingId, transcript) {
  if (!meetingId || !transcript) return;

  const formattedData = meetingPlatformService.formatTranscript('googleMeet', {
    text: transcript.text,
    speaker: transcript.speaker?.name,
    timestamp: transcript.timestamp
  });

  await meetingPlatformService.processTranscript(
    'googleMeet',
    meetingId,
    formattedData
  );
}

async function handleParticipantJoined(meeting) {
  if (!meeting?.id) return;

  const activeMeeting = meetingPlatformService.getMeeting(meeting.id);
  if (activeMeeting && meeting.participant) {
    activeMeeting.participants.push({
      id: meeting.participant.id,
      name: meeting.participant.name,
      email: meeting.participant.email,
      joinTime: new Date().toISOString()
    });
  }
}

async function getAccessToken(code) {
  const config = meetingPlatformService.platformConfigs.googleMeet;

  const params = {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code'
  };

  const response = await axios.post(
    'https://oauth2.googleapis.com/token',
    params,
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

module.exports = router;