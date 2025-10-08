const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class AuthService {
  constructor() {
    // Session storage (keep in-memory for tokens)
    this.sessions = new Map();
    this.dataFile = path.join(__dirname, '../data/auth-data.json');

    // Load persisted data
    this.loadData();
  }

  /**
   * Load users and sessions from file
   */
  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));

        // Restore users
        if (data.users) {
          this.users = new Map(data.users);
        }

        // Restore sessions
        if (data.sessions) {
          this.sessions = new Map(data.sessions);
        }

        console.log(`Loaded ${this.users.size} users and ${this.sessions.size} sessions`);
      }
    } catch (error) {
      console.error('Error loading auth data:', error.message);
    }
  }

  /**
   * Save users and sessions to file
   */
  saveData() {
    try {
      const dir = path.dirname(this.dataFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        users: Array.from(this.users.entries()),
        sessions: Array.from(this.sessions.entries())
      };

      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving auth data:', error.message);
    }
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

    // Save to disk
    this.saveData();

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

    // Save to disk
    this.saveData();

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

    if (!user.dataSources) {
      user.dataSources = {};
    }

    user.dataSources[source] = {
      ...user.dataSources[source],
      ...status,
      connected: true,
      connectedAt: new Date().toISOString()
    };

    // Initialize brain data if not exists
    if (!user.brainData) {
      user.brainData = [];
    }

    // Add to brain data
    if (source === 'documentation' && status.url) {
      user.brainData.push({
        id: this.generateId(),
        source: 'documentation',
        type: 'url',
        content: status.url,
        category: status.category || 'General',
        tags: status.tags || [],
        addedAt: new Date().toISOString()
      });
    }

    if (source === 'documentation' && status.files) {
      status.files.forEach(file => {
        user.brainData.push({
          id: this.generateId(),
          source: 'documentation',
          type: 'file',
          content: file.path,
          filename: file.originalName,
          category: status.category || 'General',
          tags: status.tags || [],
          addedAt: new Date().toISOString()
        });
      });
    }

    // Save to disk
    this.saveData();

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
   * Delete brain item
   */
  async deleteBrainItem(userId, itemId) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.brainData) {
      throw new Error('Item not found');
    }

    const itemIndex = user.brainData.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    // Remove item from brain data
    user.brainData.splice(itemIndex, 1);

    // Save to disk
    this.saveData();

    return true;
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

  /**
   * Delete user account
   */
  async deleteAccount(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete user from database
    await User.findByIdAndDelete(userId);

    // Remove all sessions for this user
    for (const [token, sessionUserId] of this.sessions.entries()) {
      if (sessionUserId === userId) {
        this.sessions.delete(token);
      }
    }

    return { success: true };
  }
}

module.exports = new AuthService();