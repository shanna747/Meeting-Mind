const transcriptService = require('./transcriptService');
const subscriptionEnforcer = require('./subscriptionEnforcer');
const crypto = require('crypto');

class MeetingPlatformService {
  constructor() {
    this.activeMeetings = new Map();
    this.platformConfigs = {
      zoom: {
        enabled: !!process.env.ZOOM_WEBHOOK_SECRET,
        webhookSecret: process.env.ZOOM_WEBHOOK_SECRET
      },
      teams: {
        enabled: !!process.env.TEAMS_CLIENT_ID,
        clientId: process.env.TEAMS_CLIENT_ID,
        clientSecret: process.env.TEAMS_CLIENT_SECRET,
        tenantId: process.env.TEAMS_TENANT_ID
      },
      googleMeet: {
        enabled: !!process.env.GOOGLE_CLIENT_ID,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      }
    };
  }

  /**
   * Register a new meeting session
   */
  registerMeeting(meetingData) {
    const { meetingId, platform, title, participants, startTime, userId } = meetingData;

    // Check if user can start meeting (subscription limits)
    if (userId) {
      const canStart = subscriptionEnforcer.canStartMeeting(userId);
      if (!canStart.allowed) {
        throw new Error(canStart.reason);
      }

      // Start subscription tracking
      subscriptionEnforcer.startMeetingSession(meetingId, userId, platform);
    }

    this.activeMeetings.set(meetingId, {
      meetingId,
      platform,
      title,
      participants: participants || [],
      startTime: startTime || new Date().toISOString(),
      status: 'active',
      transcriptChunks: [],
      userId
    });

    return { success: true, meetingId };
  }

  /**
   * End a meeting session
   */
  endMeeting(meetingId) {
    const meeting = this.activeMeetings.get(meetingId);
    if (meeting) {
      meeting.status = 'ended';
      meeting.endTime = new Date().toISOString();

      // End subscription tracking
      subscriptionEnforcer.endMeetingSession(meetingId, 'manual');

      return { success: true, meeting };
    }
    return { success: false, error: 'Meeting not found' };
  }

  /**
   * Get active meeting
   */
  getMeeting(meetingId) {
    return this.activeMeetings.get(meetingId);
  }

  /**
   * Get all active meetings
   */
  getActiveMeetings() {
    return Array.from(this.activeMeetings.values()).filter(
      meeting => meeting.status === 'active'
    );
  }

  /**
   * Process incoming transcript from any platform
   */
  async processTranscript(platform, meetingId, transcriptData, userId = null) {
    const { text, speaker, timestamp } = transcriptData;

    // Check if meeting can continue (subscription limits)
    const canContinue = subscriptionEnforcer.canMeetingContinue(meetingId);
    if (!canContinue.allowed) {
      throw new Error(`Meeting cannot continue: ${canContinue.reason}`);
    }

    // Ensure meeting is registered
    if (!this.activeMeetings.has(meetingId)) {
      this.registerMeeting({
        meetingId,
        platform,
        title: `${platform} Meeting`,
        startTime: new Date().toISOString(),
        userId
      });
    }

    // Store transcript chunk
    const meeting = this.activeMeetings.get(meetingId);
    meeting.transcriptChunks.push({
      text,
      speaker,
      timestamp: timestamp || Date.now(),
      platform
    });

    // Ingest into transcript service
    await transcriptService.ingestChunk({
      text,
      speaker: speaker || 'Unknown',
      timestamp: timestamp || Date.now(),
      meetingId
    });

    return { success: true };
  }

  /**
   * Verify Zoom webhook signature
   */
  verifyZoomWebhook(payload, signature, timestamp) {
    const secret = this.platformConfigs.zoom.webhookSecret;
    if (!secret) return false;

    const message = `v0:${timestamp}:${JSON.stringify(payload)}`;
    const hash = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    const expectedSignature = `v0=${hash}`;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Verify Microsoft Teams signature
   */
  verifyTeamsWebhook(payload, signature) {
    // Teams uses HMAC-SHA256 with base64 encoding
    const secret = this.platformConfigs.teams.clientSecret;
    if (!secret) return false;

    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    );
  }

  /**
   * Check if platform is configured
   */
  isPlatformEnabled(platform) {
    return this.platformConfigs[platform]?.enabled || false;
  }

  /**
   * Get platform configuration status
   */
  getPlatformStatus() {
    return {
      zoom: {
        enabled: this.isPlatformEnabled('zoom'),
        configured: !!this.platformConfigs.zoom.webhookSecret
      },
      teams: {
        enabled: this.isPlatformEnabled('teams'),
        configured: !!(
          this.platformConfigs.teams.clientId &&
          this.platformConfigs.teams.clientSecret
        )
      },
      googleMeet: {
        enabled: this.isPlatformEnabled('googleMeet'),
        configured: !!(
          this.platformConfigs.googleMeet.clientId &&
          this.platformConfigs.googleMeet.clientSecret
        )
      }
    };
  }

  /**
   * Format platform-specific transcript data
   */
  formatTranscript(platform, rawData) {
    switch (platform) {
      case 'zoom':
        return {
          text: rawData.transcript || rawData.text,
          speaker: rawData.speaker_name || rawData.speaker,
          timestamp: rawData.timestamp || Date.now()
        };

      case 'teams':
        return {
          text: rawData.content || rawData.text,
          speaker: rawData.from?.user?.displayName || rawData.speaker,
          timestamp: new Date(rawData.createdDateTime || Date.now()).getTime()
        };

      case 'googleMeet':
        return {
          text: rawData.transcript || rawData.text,
          speaker: rawData.participant?.name || rawData.speaker,
          timestamp: rawData.timestamp || Date.now()
        };

      default:
        return {
          text: rawData.text,
          speaker: rawData.speaker || 'Unknown',
          timestamp: rawData.timestamp || Date.now()
        };
    }
  }
}

module.exports = new MeetingPlatformService();