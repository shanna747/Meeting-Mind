const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documentation/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.md', '.txt', '.docx'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get data source connection status
router.get('/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);

    res.json(user.dataSources || {
      documentation: { connected: false },
      slack: { connected: false },
      googleSheets: { connected: false },
      notion: { connected: false },
      confluence: { connected: false }
    });
  } catch (error) {
    console.error('Error getting data source status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Documentation upload endpoint
router.post('/documentation/upload', upload.array('files', 10), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { url, category, tags } = req.body;
    const files = req.files || [];

    // Store documentation metadata
    await authService.updateDataSource(user.id, 'documentation', {
      files: files.map(f => ({ filename: f.filename, originalName: f.originalname, path: f.path })),
      url,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      uploadedAt: new Date().toISOString()
    });

    res.json({ success: true, filesUploaded: files.length });
  } catch (error) {
    console.error('Documentation upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Slack configuration endpoint
router.post('/slack/configure', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { workspace, channels } = req.body;

    // Store Slack configuration
    await authService.updateDataSource(user.id, 'slack', {
      workspace,
      channels: channels ? channels.split(',').map(c => c.trim()) : []
    });

    // Generate OAuth URL
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/datasources/slack/callback';
    const scopes = 'channels:history,channels:read,users:read,search:read';
    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    res.json({ authUrl });
  } catch (error) {
    console.error('Slack configuration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Slack integration endpoints
router.get('/slack/auth-url', (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/datasources/slack/callback';

  if (!clientId) {
    return res.status(400).json({ error: 'Slack integration not configured' });
  }

  const scopes = 'channels:history,channels:read,users:read,search:read';
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.json({ authUrl });
});

router.get('/slack/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // TODO: Exchange code for access token and store
  // For now, just redirect to dashboard
  res.redirect('/?connection=slack&status=success');
});

// Google Sheets integration endpoints
router.get('/google-sheets/auth-url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_SHEETS_REDIRECT_URI || 'http://localhost:3000/api/datasources/google-sheets/callback';

  if (!clientId) {
    return res.status(400).json({ error: 'Google Sheets integration not configured' });
  }

  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ];

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('access_type', 'offline');

  res.json({ authUrl: authUrl.toString() });
});

router.get('/google-sheets/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // TODO: Exchange code for access token and store
  res.redirect('/?connection=google-sheets&status=success');
});

// Google Sheets configuration endpoint
router.post('/google-sheets/configure', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { sheetUrl, refreshFrequency } = req.body;

    // Store Google Sheets configuration
    await authService.updateDataSource(user.id, 'googleSheets', {
      sheetUrl,
      refreshFrequency
    });

    // Generate OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_SHEETS_REDIRECT_URI || 'http://localhost:3000/api/datasources/google-sheets/callback';
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');

    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Google Sheets configuration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Notion integration endpoints
router.get('/notion/auth-url', (req, res) => {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/api/datasources/notion/callback';

  if (!clientId) {
    return res.status(400).json({ error: 'Notion integration not configured' });
  }

  const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.json({ authUrl });
});

router.get('/notion/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // TODO: Exchange code for access token and store
  res.redirect('/?connection=notion&status=success');
});

// Notion configuration endpoint
router.post('/notion/configure', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { workspace, syncFrequency } = req.body;

    // Store Notion configuration
    await authService.updateDataSource(user.id, 'notion', {
      workspace,
      syncFrequency
    });

    // Generate OAuth URL
    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/api/datasources/notion/callback';
    const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;

    res.json({ authUrl });
  } catch (error) {
    console.error('Notion configuration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Confluence integration endpoints
router.get('/confluence/auth-url', (req, res) => {
  const clientId = process.env.CONFLUENCE_CLIENT_ID;
  const redirectUri = process.env.CONFLUENCE_REDIRECT_URI || 'http://localhost:3000/api/datasources/confluence/callback';

  if (!clientId) {
    return res.status(400).json({ error: 'Confluence integration not configured' });
  }

  const scopes = 'read:confluence-content.all read:confluence-space.summary read:confluence-props read:confluence-user';
  const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&prompt=consent`;

  res.json({ authUrl });
});

router.get('/confluence/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // TODO: Exchange code for access token and store
  res.redirect('/?connection=confluence&status=success');
});

// Confluence configuration endpoint
router.post('/confluence/configure', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { siteUrl, email, spaces } = req.body;

    // Store Confluence configuration
    await authService.updateDataSource(user.id, 'confluence', {
      siteUrl,
      email,
      spaces: spaces ? spaces.split(',').map(s => s.trim()) : []
    });

    // Generate OAuth URL
    const clientId = process.env.CONFLUENCE_CLIENT_ID;
    const redirectUri = process.env.CONFLUENCE_REDIRECT_URI || 'http://localhost:3000/api/datasources/confluence/callback';
    const scopes = 'read:confluence-content.all read:confluence-space.summary read:confluence-props read:confluence-user';
    const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&prompt=consent`;

    res.json({ authUrl });
  } catch (error) {
    console.error('Confluence configuration error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;