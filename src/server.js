import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { appendToSheet } from './sheets.js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN;

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
  if (event.object_type === 'activity' && event.aspect_type === 'create') {
    try {
      await handleNewActivity(event.object_id, event.owner_id);
    } catch (error) {
      console.error('Error handling activity:', error);
    }
  }
});

// Fetch activity details from Strava and add to Google Sheets
async function handleNewActivity(activityId, athleteId) {
  console.log(`Processing activity ${activityId} for athlete ${athleteId}`);

  // Get athlete's access token (you'll need to store this after OAuth)
  // For simplicity, this example assumes you have a single athlete
  // In production, you'd store tokens in a database per athlete
  const accessToken = await getAthleteAccessToken(athleteId);

  if (!accessToken) {
    console.error('No access token found for athlete');
    return;
  }

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

  // Add to Google Sheets
  await appendToSheet([date, time, title, notes, type, distance, duration]);
  console.log(`Activity "${title}" added to Google Sheets`);
}

// Format duration from seconds to HH:MM:SS
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Get athlete's access token
// In production, store tokens in a database and refresh when needed
async function getAthleteAccessToken(athleteId) {
  // For now, return from environment variable
  // You'll need to implement OAuth flow and token storage
  return process.env.STRAVA_ACCESS_TOKEN;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook URL: ${process.env.WEBHOOK_CALLBACK_URL || `http://localhost:${PORT}/webhook`}`);
});
