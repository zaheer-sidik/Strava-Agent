# Strava to Google Sheets Sync

Automatically sync your Strava activities to Google Sheets in real-time. When you upload a new activity to Strava, it will automatically appear in your Google Sheets with the date, time, title, notes, activity type, distance, and duration.

## Features

- 🏃 Real-time sync when new Strava activities are uploaded
- 📊 Captures: Date, Time, Activity Title, Notes, Type, Distance, and Duration
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

## Prerequisites

- Node.js (v18 or higher)
- A Strava account
- A Google account with Google Sheets access
- A GitHub account (for deployment)
- A Render account (free)

## Deployment Guide

See the full setup instructions including Strava API, Google Sheets, and Render deployment in the repository.

## Security

- Never commit `.env` or `google-credentials.json` files
- All sensitive data excluded via `.gitignore`
- Environment variables used for deployment

## License

MIT
