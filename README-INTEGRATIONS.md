# Meeting Platform Integrations

This guide explains how to integrate Meeting Mind with Zoom, Microsoft Teams, and Google Meet.

## API Endpoints

### Base URL
All integration endpoints are prefixed with: `/api/integrations`

---

## Zoom Integration

### Endpoints

#### Start Meeting
```http
POST /api/integrations/zoom/meeting/start
Content-Type: application/json

{
  "meetingId": "123456789",
  "title": "Team Standup",
  "participants": ["user1", "user2"],
  "hostId": "host@company.com"
}
```

#### Send Transcript
```http
POST /api/integrations/zoom/transcript
Content-Type: application/json

{
  "meetingId": "123456789",
  "transcript": "Hello everyone, let's begin the meeting",
  "speaker": "John Doe",
  "timestamp": 1234567890
}
```

#### Webhook (for Zoom to call)
```http
POST /api/integrations/zoom/webhook
X-Zm-Signature: <signature>
X-Zm-Request-Timestamp: <timestamp>
```

### Setup Instructions

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Create a new app (Webhook-only or OAuth)
3. Add webhook subscription URL: `https://yourdomain.com/api/integrations/zoom/webhook`
4. Subscribe to events:
   - `meeting.started`
   - `meeting.ended`
   - `recording.transcript_completed`
5. Copy your webhook secret token
6. Add to `.env`: `ZOOM_WEBHOOK_SECRET=your_secret_here`

---

## Microsoft Teams Integration

### Endpoints

#### Start Meeting
```http
POST /api/integrations/teams/meeting/start
Content-Type: application/json

{
  "meetingId": "abc-def-ghi",
  "title": "Sprint Planning",
  "participants": ["user1@company.com"],
  "organizer": "host@company.com"
}
```

#### Send Transcript
```http
POST /api/integrations/teams/transcript
Content-Type: application/json

{
  "meetingId": "abc-def-ghi",
  "content": "Let's review the sprint goals",
  "speaker": "Jane Smith",
  "createdDateTime": "2024-01-15T10:30:00Z"
}
```

#### Webhook
```http
POST /api/integrations/teams/webhook
```

### Setup Instructions

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new app in Azure AD
3. Add API permissions:
   - `OnlineMeetings.Read.All`
   - `Calendars.Read`
4. Create client secret
5. Add to `.env`:
   ```
   TEAMS_CLIENT_ID=your_client_id
   TEAMS_CLIENT_SECRET=your_client_secret
   TEAMS_TENANT_ID=your_tenant_id
   ```
6. Configure redirect URI in Azure: `http://localhost:3000/api/integrations/teams/auth/callback`

---

## Google Meet Integration

### Endpoints

#### Start Meeting
```http
POST /api/integrations/google-meet/meeting/start
Content-Type: application/json

{
  "meetingId": "xyz-123-abc",
  "title": "Product Demo",
  "participants": ["user@company.com"],
  "organizerEmail": "host@company.com"
}
```

#### Send Transcript
```http
POST /api/integrations/google-meet/transcript
Content-Type: application/json

{
  "meetingId": "xyz-123-abc",
  "transcript": "Welcome to the product demonstration",
  "participant": {
    "name": "Sarah Johnson"
  },
  "timestamp": 1234567890
}
```

#### Get Auth URL
```http
GET /api/integrations/google-meet/auth/url
```

### Setup Instructions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable APIs:
   - Google Calendar API
   - Google Meet API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/integrations/google-meet/auth/callback`
6. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

---

## Generic Integration Endpoint

For custom or other platforms:

```http
POST /api/integrations/transcript
Content-Type: application/json

{
  "platform": "zoom|teams|googleMeet|custom",
  "meetingId": "unique-meeting-id",
  "text": "Transcript text here",
  "speaker": "Speaker Name",
  "timestamp": 1234567890
}
```

---

## Check Integration Status

```http
GET /api/integrations/status

Response:
{
  "zoom": {
    "enabled": true,
    "configured": true
  },
  "teams": {
    "enabled": false,
    "configured": false
  },
  "googleMeet": {
    "enabled": false,
    "configured": false
  }
}
```

---

## Get Active Meetings

```http
GET /api/integrations/meetings/active

Response:
{
  "meetings": [
    {
      "meetingId": "123456789",
      "platform": "zoom",
      "title": "Team Standup",
      "status": "active",
      "startTime": "2024-01-15T10:00:00Z",
      "participants": [...]
    }
  ]
}
```

---

## WebSocket Real-time Updates

Connect to WebSocket at `ws://localhost:3000` to receive real-time transcript updates:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'transcript_update') {
    console.log('New transcript:', data.data);
  }
};

// Send transcript chunk
ws.send(JSON.stringify({
  type: 'transcript_chunk',
  payload: {
    text: 'Meeting transcript',
    speaker: 'John Doe',
    meetingId: '123456789'
  }
}));
```

---

## Notes

- All timestamps should be in milliseconds (Unix epoch)
- Transcript text is automatically embedded and stored in the vector database
- Meeting transcripts are searchable via the Company Brain API
- Webhook signatures are verified for security when configured