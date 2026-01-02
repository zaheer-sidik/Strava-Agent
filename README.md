# Strava to Google Sheets Sync

Automatically sync your Strava activities to Google Sheets in real-time. When you upload a new activity to Strava, it will automatically appear in your Google Sheets with the date, time, title, notes, activity type, distance, and duration.

## Features

- 🏃 Real-time sync when new Strava activities are uploaded
- 📊 Captures: Date, Time, Activity Title, Notes, Type, Distance, and Duration
- 🏅 Power of 10 Personal Bests integration (UK Athletics) via web scraping
- ☁️ Webhook-based (no polling required)
- 🔐 Secure authentication with Strava and Google APIs
- 🚀 Deployed on Render (free hosting)

## Data Captured

The Google Sheet will contain the following columns:
- **Date**: Activity date in format "Monday 22/12/2025"
- **Time**: Activity start time in format "14:30"
- **Activity Title**: Name of the activity
- **Notes**: Description/notes from Strava
- **Type**: Activity type (Run, Ride, Swim, etc.)
- **Distance**: Distance in kilometers
- **Duration**: Moving time in HH:MM:SS format

### Power of 10 Integration

If configured, a Power of 10 personal bests section will appear to the right of your Strava data showing:
- Personal best times for common running distances (800m, 1500m, 5K, 10K, Half Marathon, Marathon, etc.)
- Venue and date for each PB
- Automatically fetches from UK Athletics Power of 10 database

## Prerequisites

- Node.js (v18 or higher)
- Python 3.x (for Power of 10 integration)
- A Strava account
- A Google account with Google Sheets access
- A GitHub account (for deployment)
- A Render account (free)
- Optional: Power of 10 athlete ID for PB tracking

## Environment Variables

Add the following to your `.env` file:

```
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_VERIFY_TOKEN=your_verify_token
STRAVA_ACCESS_TOKEN=your_access_token
STRAVA_REFRESH_TOKEN=your_refresh_token
GOOGLE_SHEETS_ID=your_google_sheet_id
POWER_OF_10_ATHLETE_ID=your_power_of_10_athlete_id (optional)
```

## API Endpoints

- `GET /webhook` - Strava webhook validation
- `POST /webhook` - Receive Strava activity updates
- `GET /api/power-of-10-pbs` - Fetch Power of 10 personal bests
- `POST /api/power-of-10-pbs/update-sheet` - Update Google Sheet with latest PBs
- `GET /health` - Health check endpoint

## Deployment Guide

See the full setup instructions including Strava API, Google Sheets, and Render deployment in the repository.

## Security

- Never commit `.env` or `google-credentials.json` files
- All sensitive data excluded via `.gitignore`
- Environment variables used for deployment

## License

MIT
