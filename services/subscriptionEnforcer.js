const authService = require('./authService');

class SubscriptionEnforcer {
  constructor() {
    // Track active meeting sessions with timers
    this.activeSessions = new Map();
    this.wss = null; // Will be set by server
  }

  /**
   * Set WebSocket server for notifications
   */
  setWebSocketServer(wss) {
    this.wss = wss;
  }

  /**
   * Start tracking a meeting session
   */
  startMeetingSession(meetingId, userId, platform) {
    const user = authService.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if meeting already being tracked
    if (this.activeSessions.has(meetingId)) {
      console.log(`Meeting ${meetingId} already being tracked`);
      return this.activeSessions.get(meetingId);
    }

    const limits = user.subscriptionLimits;
    const durationLimit = limits.meetingDuration * 60 * 1000; // Convert to milliseconds

    const session = {
      meetingId,
      userId,
      platform,
      subscription: user.subscription,
      startTime: Date.now(),
      durationLimit,
      active: true,
      warningsSent: []
    };

    this.activeSessions.set(meetingId, session);

    // Set warning timers
    this.setWarningTimers(session);

    // Set automatic shutoff timer
    this.setShutoffTimer(session);

    console.log(`Started tracking meeting ${meetingId} for user ${user.name} (${user.subscription})`);
    console.log(`Meeting will end after ${limits.meetingDuration} minutes`);

    return session;
  }

  /**
   * Set warning timers for approaching time limit
   */
  setWarningTimers(session) {
    const { meetingId, durationLimit } = session;

    // Send warning at 80% of time limit
    const warning1Time = durationLimit * 0.8;
    setTimeout(() => {
      if (session.active) {
        this.sendWarning(session, 'approaching');
      }
    }, warning1Time);

    // Send warning at 95% of time limit
    const warning2Time = durationLimit * 0.95;
    setTimeout(() => {
      if (session.active) {
        this.sendWarning(session, 'final');
      }
    }, warning2Time);
  }

  /**
   * Set automatic shutoff timer
   */
  setShutoffTimer(session) {
    const { meetingId, durationLimit } = session;

    setTimeout(() => {
      if (session.active) {
        this.endMeetingSession(meetingId, 'time_limit_reached');
      }
    }, durationLimit);
  }

  /**
   * Send warning to user
   */
  sendWarning(session, warningType) {
    const { meetingId, userId, durationLimit } = session;
    const elapsed = Date.now() - session.startTime;
    const remaining = Math.ceil((durationLimit - elapsed) / 1000 / 60); // minutes

    const warnings = {
      approaching: {
        title: 'Time Limit Approaching',
        message: `Your meeting will automatically end in ${remaining} minutes due to your subscription limits.`,
        remainingMinutes: remaining
      },
      final: {
        title: 'Final Warning',
        message: `Your meeting will end in ${remaining} minute(s). Upgrade your plan for longer meetings.`,
        remainingMinutes: remaining
      }
    };

    const warning = warnings[warningType];
    session.warningsSent.push(warningType);

    // Send via WebSocket if available
    if (this.wss) {
      this.broadcastToUser(userId, {
        type: 'time_limit_warning',
        data: {
          meetingId,
          ...warning
        }
      });
    }

    console.log(`Warning sent for meeting ${meetingId}: ${warning.message}`);
  }

  /**
   * End meeting session
   */
  endMeetingSession(meetingId, reason = 'manual') {
    const session = this.activeSessions.get(meetingId);

    if (!session) {
      console.log(`Meeting ${meetingId} not found in active sessions`);
      return;
    }

    session.active = false;
    session.endTime = Date.now();
    session.endReason = reason;

    const duration = Math.round((session.endTime - session.startTime) / 1000 / 60);

    console.log(`Meeting ${meetingId} ended. Reason: ${reason}. Duration: ${duration} minutes`);

    // Notify user
    if (this.wss && reason === 'time_limit_reached') {
      this.broadcastToUser(session.userId, {
        type: 'meeting_ended',
        data: {
          meetingId,
          reason: 'subscription_limit',
          message: 'Meeting ended due to subscription time limit. Upgrade for longer meetings.',
          duration
        }
      });
    }

    // Keep session in memory for 5 minutes before removing
    setTimeout(() => {
      this.activeSessions.delete(meetingId);
    }, 5 * 60 * 1000);

    return session;
  }

  /**
   * Check if meeting can continue
   */
  canMeetingContinue(meetingId) {
    const session = this.activeSessions.get(meetingId);

    if (!session) {
      return { allowed: false, reason: 'Session not found' };
    }

    if (!session.active) {
      return { allowed: false, reason: 'Session ended' };
    }

    const elapsed = Date.now() - session.startTime;

    if (elapsed >= session.durationLimit) {
      return { allowed: false, reason: 'Time limit exceeded' };
    }

    const remaining = Math.ceil((session.durationLimit - elapsed) / 1000 / 60);

    return {
      allowed: true,
      remainingMinutes: remaining,
      elapsedMinutes: Math.floor(elapsed / 1000 / 60)
    };
  }

  /**
   * Get active session info
   */
  getSessionInfo(meetingId) {
    const session = this.activeSessions.get(meetingId);

    if (!session) {
      return null;
    }

    const elapsed = Date.now() - session.startTime;
    const remaining = Math.max(0, session.durationLimit - elapsed);

    return {
      meetingId: session.meetingId,
      platform: session.platform,
      subscription: session.subscription,
      active: session.active,
      elapsedMinutes: Math.floor(elapsed / 1000 / 60),
      remainingMinutes: Math.ceil(remaining / 1000 / 60),
      limitMinutes: Math.floor(session.durationLimit / 1000 / 60)
    };
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId) {
    const sessions = [];

    for (const session of this.activeSessions.values()) {
      if (session.userId === userId && session.active) {
        sessions.push(this.getSessionInfo(session.meetingId));
      }
    }

    return sessions;
  }

  /**
   * Broadcast message to specific user
   */
  broadcastToUser(userId, message) {
    if (!this.wss) return;

    // In a production app, you'd track which WebSocket connections
    // belong to which users. For now, broadcast to all.
    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Check if user can start a new meeting
   */
  canStartMeeting(userId) {
    const user = authService.getUserById(userId);

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Check if user already has an active meeting
    const activeSessions = this.getUserSessions(userId);

    if (activeSessions.length > 0) {
      return {
        allowed: false,
        reason: 'You already have an active meeting',
        activeMeetings: activeSessions
      };
    }

    // Additional checks could be added here:
    // - Monthly meeting limit
    // - Payment status
    // - Account standing

    return { allowed: true };
  }
}

module.exports = new SubscriptionEnforcer();