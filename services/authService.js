const crypto = require('crypto');
const User = require('../models/User');

class AuthService {
  constructor() {
    // Session storage (keep in-memory for tokens)
    this.sessions = new Map();
  }

  /**
   * Register a new user
   */
  async register(userData) {
    const { name, email, password, company, subscription } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = this.hashPassword(password);

    // Create user document
    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      company: company || '',
      subscription: subscription || 'free',
      dataSources: {
        documentation: { connected: false },
        slack: { connected: false },
        googleSheets: { connected: false },
        notion: { connected: false },
        confluence: { connected: false }
      }
    });

    // Save to database
    await user.save();

    // Generate token
    const token = this.generateToken(user._id.toString());

    return {
      user: user.toSafeObject(),
      token
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const passwordHash = this.hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    // Generate new token
    const token = this.generateToken(user._id.toString());

    return {
      user: user.toSafeObject(),
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

    const user = await User.findById(session.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user.toSafeObject();
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
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.subscription = newSubscription;
    await user.save();

    return user.toSafeObject();
  }

  /**
   * Update data source connection status
   */
  async updateDataSource(userId, source, status) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.dataSources) {
      // Get existing data (handle both object and plain value)
      const existingData = user.dataSources[source] || { connected: false };
      const existingObj = typeof existingData === 'object' ? existingData : { connected: false };

      // Merge with new status
      user.dataSources[source] = {
        ...existingObj,
        ...status,
        connected: true,
        connectedAt: new Date()
      };

      // Mark as modified for Mixed types
      user.markModified('dataSources');
      await user.save();
    }

    return user.toSafeObject();
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId);
    return user ? user.toSafeObject() : null;
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
   * Get all users (admin only)
   */
  async getAllUsers() {
    const users = await User.find({});
    return users.map(user => user.toSafeObject());
  }
}

module.exports = new AuthService();