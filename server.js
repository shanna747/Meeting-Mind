const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const transcriptRouter = require('./routes/transcript');
const companyBrainRouter = require('./routes/companyBrain');
const integrationsRouter = require('./routes/integrations');
const authRouter = require('./routes/auth');
const datasourcesRouter = require('./routes/datasources');
const subscriptionEnforcer = require('./services/subscriptionEnforcer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Set WebSocket server for subscription enforcer
subscriptionEnforcer.setWebSocketServer(wss);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/transcript', transcriptRouter);
app.use('/api/company-brain', companyBrainRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/datasources', datasourcesRouter);

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch(data.type) {
        case 'transcript_chunk':
          // Broadcast transcript chunk to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'transcript_update',
                data: data.payload
              }));
            }
          });
          break;

        case 'query_company_brain':
          // Handle company brain queries in real-time
          ws.send(JSON.stringify({
            type: 'company_brain_response',
            data: { status: 'processing', query: data.payload }
          }));
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is ready`);
});

module.exports = { app, server, wss };