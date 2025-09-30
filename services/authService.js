const crypto = require('crypto');

class AuthService {
  constructor() {
    // In-memory user storage (replace with database in production)
    this.users = new Map();
    this.sessions = new Map();
  }

  /**
   * Register a new user
   */
  async register(userData) {
    const { name, email, password, company, subscription } = userData;

    // Check if user already exists
    if (this.findUserByEmail(email)) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = this.hashPassword(password);

    // Create user object
    const user = {
      id: this.generateId(),
      name,
      email,
      passwordHash,
      company: company || '',
      subscription: subscription || 'free',
      createdAt: new Date().toISOString(),
      dataSources: {
        documentation: { connected: false },
        slack: { connected: false },
        googleSheets: { connected: false },
        notion: { connected: false },
        confluence: { connected: false }
      },
      subscriptionLimits: this.getSubscriptionLimits(subscription)
    };

    // Store user
    this.users.set(user.id, user);

    // Generate token
    const token = this.generateToken(user.id);

    return {
      user: this.sanitizeUser(user),
      token
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    const user = this.findUserByEmail(email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const passwordHash = this.hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    // Generate new token
    const token = this.generateToken(user.id);

    return {
      user: this.sanitizeUser(user),
      token
    };
  }

  /**
   * Verify token and get user
   */
  async verifyToken(token) {
    const session = this.sessions.get(token);

    if (!session) {
      throw new Error('Invalid or expired token');
    }

    // Check if token is expired (24 hours)
    const expirationTime = 24 * 60 * 60 * 1000;
    if (Date.now() - session.createdAt > expirationTime) {
      this.sessions.delete(token);
      throw new Error('Token expired');
    }

    const user = this.users.get(session.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Logout user
   */
  async logout(token) {
    this.sessions.delete(token);
    return { success: true };
  }

  /**
   * Update user subscription
   */
  async updateSubscription(userId, newSubscription) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.subscription = newSubscription;
    user.subscriptionLimits = this.getSubscriptionLimits(newSubscription);

    return this.sanitizeUser(user);
  }

  /**
   * Update data source connection status
   */
  async updateDataSource(userId, source, status) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.dataSources[source]) {
      user.dataSources[source] = {
        ...user.dataSources[source],
        ...status,
        connected: true,
        connectedAt: new Date().toISOString()
      };
    }

    return this.sanitizeUser(user);
  }

  /**
   * Get user by ID
   */
  getUserById(userId) {
    const user = this.users.get(userId);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Get subscription limits for a plan
   */
  getSubscriptionLimits(subscription) {
    const limits = {
      free: {
        meetingDuration: 15, // minutes
        monthlyMeetings: 10,
        features: ['basic_transcription', 'company_brain', 'integrations']
      },
      pro: {
        meetingDuration: 30,
        monthlyMeetings: 50,
        features: ['advanced_transcription', 'company_brain', 'integrations', 'priority_support']
      },
      business: {
        meetingDuration: 60,
        monthlyMeetings: -1, // unlimited
        features: ['premium_transcription', 'company_brain', 'integrations', 'priority_support', 'custom_features']
      }
    };

    return limits[subscription] || limits.free;
  }

  /**
   * Helper: Find user by email
   */
  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  /**
   * Helper: Hash password
   */
  hashPassword(password) {
    return crypto
      .createHash('sha256')
      .update(password + process.env.PASSWORD_SALT || 'meeting-mind-salt')
      .digest('hex');
  }

  /**
   * Helper: Generate user ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Helper: Generate auth token
   */
  generateToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');

    this.sessions.set(token, {
      userId,
      createdAt: Date.now()
    });

    return token;
  }

  /**
   * Helper: Remove sensitive data from user object
   */
  sanitizeUser(user) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers() {
    return Array.from(this.users.values()).map(user => this.sanitizeUser(user));
  }
}

module.exports = new AuthService();