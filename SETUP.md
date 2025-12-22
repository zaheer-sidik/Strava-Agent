# Complete Setup Guide

This guide will walk you through setting up the Strava to Google Sheets sync from scratch.

## Table of Contents

1. [Strava API Setup](#1-strava-api-setup)
2. [Get Strava Access Token](#2-get-strava-access-token)
3. [Google Sheets Setup](#3-google-sheets-setup)
4. [Deploy to Render](#4-deploy-to-render)
5. [Subscribe to Strava Webhooks](#5-subscribe-to-strava-webhooks)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 1. Strava API Setup

1. Go to [https://www.strava.com/settings/api](https://www.strava.com/settings/api)

2. Click "Create an App" or manage your existing app

3. Fill in the details:
   - **Application Name**: `My Strava Sheets Sync` (or any name you prefer)
   - **Category**: Select any appropriate category
   - **Club**: Leave blank
   - **Website**: `http://localhost:3000`
   - **Authorization Callback Domain**: `localhost`
   - **Application Description**: Brief description of your app

4. Click "Create"

5. **Save these credentials** (you'll need them later):
   - **Client ID**
   - **Client Secret**

---

## 2. Get Strava Access Token

You need to authorize your app to read your activities.

### Step 2.1: Generate Authorization URL

Replace `YOUR_CLIENT_ID` with your actual Client ID from Step 1:

```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/exchange_token&approval_prompt=force&scope=activity:read_all
```

### Step 2.2: Authorize the App

1. Open the URL from Step 2.1 in your browser
2. Click "Authorize"
3. You'll be redirected to a URL that looks like:
   ```
   http://localhost:3000/exchange_token?state=&code=SOME_LONG_CODE&scope=read,activity:read_all
   ```
4. **Copy the `code` value** from the URL (the part after `code=` and before `&scope`)

### Step 2.3: Exchange Code for Tokens

Run this curl command, replacing the placeholders:

```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d code=YOUR_CODE_FROM_STEP_2_2 \
  -d grant_type=authorization_code
```

The response will look like:
```json
{
  "token_type": "Bearer",
  "expires_at": 1234567890,
  "expires_in": 21600,
  "refresh_token": "abc123...",
  "access_token": "xyz789..."
}
```

**Save both** `access_token` and `refresh_token` - you'll need them for Render deployment.

---

## 3. Google Sheets Setup

### Step 3.1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" > "New Project"
3. Enter a project name (e.g., "Strava Sheets Sync")
4. Click "Create"

### Step 3.2: Enable Google Sheets API

1. In your new project, go to "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click on it and click "Enable"

### Step 3.3: Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Enter details:
   - **Service account name**: `sheets-activity-integration`
   - **Service account ID**: (auto-generated)
   - **Description**: Optional
4. Click "Create and Continue"
5. **Skip** the optional permission steps - click "Continue" then "Done"

### Step 3.4: Create Service Account Key

1. In the "Credentials" page, find your service account in the list
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Select "JSON" format
6. Click "Create"
7. The JSON key file will download automatically

### Step 3.5: Get Base64 Encoded Credentials

You need to convert the JSON file to base64 for Render:

**On Mac/Linux:**
```bash
base64 -i google-credentials.json | tr -d '\n'
```

**On Windows PowerShell:**
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("google-credentials.json"))
```

**Save this base64 string** - you'll need it for Render.

### Step 3.6: Create and Share Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Click "+ Blank" to create a new spreadsheet
3. Give it a name (e.g., "Strava Activities")
4. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
5. Click the "Share" button (top right)
6. Add the service account email (from the JSON file, looks like `sheets-activity-integration@project-name.iam.gserviceaccount.com`)
7. Set permission to "Editor"
8. **Uncheck** "Notify people"
9. Click "Share"

---

## 4. Deploy to Render

### Step 4.1: Push Code to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/Strava-Agent.git
git push -u origin main
```

### Step 4.2: Create Render Web Service

1. Go to [https://render.com](https://render.com/)
2. Sign up or log in (use GitHub for easy integration)
3. Click "New +" > "Web Service"
4. Connect your GitHub account if prompted
5. Select your `Strava-Agent` repository
6. Click "Connect"

### Step 4.3: Configure the Service

Fill in these settings:

- **Name**: `strava-sheets-sync` (or any unique name)
- **Region**: Choose the region closest to you
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: `Free`

### Step 4.4: Add Environment Variables

Click "Advanced" > "Add Environment Variable" and add each of these:

| Key | Value |
|-----|-------|
| `STRAVA_CLIENT_ID` | Your Strava Client ID from Step 1 |
| `STRAVA_CLIENT_SECRET` | Your Strava Client Secret from Step 1 |
| `STRAVA_VERIFY_TOKEN` | Any random string (e.g., `my_random_verify_token_123`) |
| `STRAVA_ACCESS_TOKEN` | Your access token from Step 2.3 |
| `STRAVA_REFRESH_TOKEN` | Your refresh token from Step 2.3 |
| `GOOGLE_SHEETS_ID` | Your spreadsheet ID from Step 3.6 |
| `GOOGLE_CREDENTIALS_BASE64` | Base64 string from Step 3.5 |
| `PORT` | `3000` |

### Step 4.5: Deploy

1. Click "Create Web Service"
2. Wait for the deployment to complete (2-3 minutes)
3. Once deployed, copy your service URL (e.g., `https://strava-sheets-sync.onrender.com`)

---

## 5. Subscribe to Strava Webhooks

Now connect Strava to your Render service.

### Step 5.1: Subscribe

Run this curl command with your actual values:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d callback_url=https://YOUR_RENDER_URL/webhook \
  -d verify_token=YOUR_VERIFY_TOKEN
```

Example:
```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=123456 \
  -d client_secret=abc123def456 \
  -d callback_url=https://strava-sheets-sync.onrender.com/webhook \
  -d verify_token=my_random_verify_token_123
```

**Expected response:**
```json
{"id":321501}
```

If you get an error, check the [Troubleshooting](#troubleshooting) section.

### Step 5.2: Verify Subscription

Check that your webhook is active:

```bash
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

You should see your subscription details.

---

## Testing

### Test the Integration

1. Go to [Strava.com](https://www.strava.com/)
2. Upload a new activity:
   - Click "+" > "Upload activity"
   - Or manually create an activity
3. Wait a few seconds
4. Check your Google Sheet - you should see the new activity!

### What You Should See

The Google Sheet will have these columns:
- **Date**: e.g., "Sunday 22/12/2025"
- **Time**: e.g., "14:30"
- **Activity Title**: e.g., "Morning Run"
- **Notes**: Any description you added
- **Type**: e.g., "Run", "Ride"
- **Distance**: e.g., "5.23 km"
- **Duration**: e.g., "0:28:45"

---

## Troubleshooting

### Webhook Validation Failed

**Error:** `callback url not verifiable`

**Solution:**
1. Check that your Render service is running (visit your Render dashboard)
2. Visit `https://YOUR_RENDER_URL/health` - should return `{"status":"ok"}`
3. Make sure the callback URL includes `/webhook` at the end

### No Activities Appearing

**Check these:**

1. **Is the service running?**
   - Go to your Render dashboard
   - Check the logs for errors

2. **Did you upload a NEW activity?**
   - Webhooks only trigger for new activities created after subscription
   - Try creating a manual activity or editing an existing one

3. **Check Render logs:**
   - Go to Render dashboard > Your service > "Logs"
   - Look for error messages

4. **Verify webhook is active:**
   ```bash
   curl -G https://www.strava.com/api/v3/push_subscriptions \
     -d client_id=YOUR_CLIENT_ID \
     -d client_secret=YOUR_CLIENT_SECRET
   ```

### Google Sheets Permission Denied

**Error:** Permission denied when writing to sheet

**Solution:**
1. Open your Google Sheet
2. Click "Share"
3. Verify the service account email is listed with "Editor" access
4. The email should match the `client_email` in your JSON credentials

### Strava API Authorization Error

**Error:** `activity:read_permission missing`

**Solution:**
1. You need to re-authorize with the correct scope
2. Go back to Step 2 and make sure the URL includes `scope=activity:read_all`
3. Get a new access token

### Service Sleeping (Render Free Tier)

**Symptom:** First activity takes 30+ seconds to appear

**Explanation:** Free Render services sleep after 15 minutes of inactivity.

**Solution:** This is normal behavior. Strava webhooks will wake up the service automatically. Subsequent activities will be faster.

---

## Additional Notes

### Token Expiration

Strava access tokens expire after 6 hours. For production use, you should implement token refresh logic using the refresh token.

### Rate Limits

- Strava API: 100 requests per 15 minutes, 1000 per day
- Google Sheets API: 60 requests per minute per user

For personal use, these limits are more than sufficient.

### Privacy

- Your credentials are stored securely in Render's encrypted environment
- The service only has access to your Strava activities (read-only)
- The Google Sheet is only accessible to you and the service account

---

## Need Help?

If you encounter issues not covered here, check:
1. Render logs for error messages
2. Strava API documentation: https://developers.strava.com/
3. Google Sheets API documentation: https://developers.google.com/sheets/
