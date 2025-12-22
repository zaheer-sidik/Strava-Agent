import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { appendToSheet, updateSheetRow } from './sheets.js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN;

// Token management
let currentAccessToken = process.env.STRAVA_ACCESS_TOKEN;
let currentRefreshToken = process.env.STRAVA_REFRESH_TOKEN;
let tokenExpiresAt = Date.now() + (6 * 60 * 60 * 1000); // 6 hours from now

// Refresh access token if expired
async function getValidAccessToken() {
  // If token is still valid (with 5 min buffer), return it
  if (Date.now() < tokenExpiresAt - (5 * 60 * 1000)) {
    return currentAccessToken;
  }

  console.log('Access token expired, refreshing...');

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: currentRefreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Update tokens in memory
    currentAccessToken = data.access_token;
    currentRefreshToken = data.refresh_token;
    tokenExpiresAt = data.expires_at * 1000; // Convert to milliseconds

    console.log('Access token refreshed successfully, expires at:', new Date(tokenExpiresAt).toISOString());
    
    return currentAccessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

// Webhook validation endpoint (GET request from Strava)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN) {
    console.log('Webhook validated');
    res.json({ 'hub.challenge': challenge });
  } else {
    console.error('Webhook validation failed');
    res.sendStatus(403);
  }
});

// Webhook event endpoint (POST request from Strava)
app.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log('Webhook event received:', JSON.stringify(event, null, 2));

  // Respond quickly to Strava (within 2 seconds)
  res.sendStatus(200);

  // Process the event
  if (event.object_type === 'activity') {
    if (event.aspect_type === 'create') {
      try {
        await handleNewActivity(event.object_id, event.owner_id);
      } catch (error) {
        console.error('Error handling activity:', error);
      }
    } else if (event.aspect_type === 'update') {
      try {
        await handleActivityUpdate(event.object_id, event.owner_id);
      } catch (error) {
        console.error('Error handling activity update:', error);
      }
    }
  }
});

// Fetch activity details from Strava and add to Google Sheets
async function handleNewActivity(activityId, athleteId) {
  console.log(`Processing activity ${activityId} for athlete ${athleteId}`);

  // Get a valid access token (will auto-refresh if expired)
  const accessToken = await getValidAccessToken();

  // Fetch activity details from Strava API
  const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    console.error('Failed to fetch activity:', response.statusText);
    return;
  }

  const activity = await response.json();
  
  // Extract relevant data
  const activityDate = new Date(activity.start_date);
  const date = activityDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/(\w+) (\d+)\/(\d+)\/(\d+)/, '$1 $2/$3/$4');
  const time = activityDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const title = activity.name || 'Untitled Activity';
  const notes = activity.description || '';
  const type = activity.type || '';
  const distance = activity.distance ? (activity.distance / 1000).toFixed(2) + ' km' : 'N/A';
  const duration = activity.moving_time ? formatDuration(activity.moving_time) : 'N/A';

  // Add to Google Sheets with activity ID for future updates
  await appendToSheet([date, time, title, notes, type, distance, duration, activityId.toString()]);
  console.log(`Activity "${title}" added to Google Sheets`);
}

// Handle activity updates (when description or other details change)
async function handleActivityUpdate(activityId, athleteId) {
  console.log(`Processing activity update ${activityId} for athlete ${athleteId}`);

  const accessToken = await getAthleteAccessToken(athleteId);

// Handle activity updates (when description or other details change)
async function handleActivityUpdate(activityId, athleteId) {
  console.log(`Processing activity update ${activityId} for athlete ${athleteId}`);

  // Get a valid access token (will auto-refresh if expired)
  const accessToken = await getValidAccessToken();

  // Fetch updated activity details from Strava API
  const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const activity = await response.json();
  
  // Extract and format updated data
  const activityDate = new Date(activity.start_date);
  const date = activityDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/(\w+) (\d+)\/(\d+)\/(\d+)/, '$1 $2/$3/$4');
  const time = activityDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const title = activity.name || 'Untitled Activity';
  const notes = activity.description || '';
  const type = activity.type || '';
  const distance = activity.distance ? (activity.distance / 1000).toFixed(2) + ' km' : 'N/A';
  const duration = activity.moving_time ? formatDuration(activity.moving_time) : 'N/A';

  // Update the existing row in Google Sheets
  await updateSheetRow(activityId.toString(), [date, time, title, notes, type, distance, duration, activityId.toString()]);
  console.log(`Activity "${title}" updated in Google Sheets`);
}

// Format duration from seconds to HH:MM:SS
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook URL: ${process.env.WEBHOOK_CALLBACK_URL || `http://localhost:${PORT}/webhook`}`);
});