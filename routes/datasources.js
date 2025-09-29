const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

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
      crm: { connected: false }
    });
  } catch (error) {
    console.error('Error getting data source status:', error);
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

// CRM integration endpoints
router.get('/crm/:crmType/auth-url', (req, res) => {
  const { crmType } = req.params;

  const crmConfigs = {
    salesforce: {
      clientId: process.env.SALESFORCE_CLIENT_ID,
      authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      scope: 'api refresh_token'
    },
    hubspot: {
      clientId: process.env.HUBSPOT_CLIENT_ID,
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      scope: 'crm.objects.contacts.read crm.objects.companies.read'
    },
    pipedrive: {
      clientId: process.env.PIPEDRIVE_CLIENT_ID,
      authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
      scope: 'deals:read contacts:read'
    }
  };

  const config = crmConfigs[crmType];

  if (!config || !config.clientId) {
    return res.status(400).json({ error: `${crmType} integration not configured` });
  }

  const redirectUri = `http://localhost:3000/api/datasources/crm/${crmType}/callback`;
  const authUrl = `${config.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${config.scope}&response_type=code`;

  res.json({ authUrl });
});

router.get('/crm/:crmType/callback', async (req, res) => {
  const { crmType } = req.params;
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // TODO: Exchange code for access token and store
  res.redirect(`/?connection=${crmType}&status=success`);
});

module.exports = router;