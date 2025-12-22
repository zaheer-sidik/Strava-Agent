# Strava to Google Sheets Sync

Automatically sync your Strava activities to Google Sheets in real-time. When you upload a new activity to Strava, it will automatically appear in your Google Sheets with the date, title, notes, activity type, distance, and duration.

## Features

- 🏃 Real-time sync when new Strava activities are uploaded
- 📊 Captures: Date, Activity Title, Notes, Type, Distance, and Duration
- ☁️ Webhook-based (no polling required)
- 🔐 Secure authentication with Strava and Google APIs

## Prerequisites

- Node.js (v18 or higher)
- A Strava account
- A Google account with access to Google Sheets
- A publicly accessible server URL (for webhook callbacks)

## Setup Instructions

### 1. Strava API Setup

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application:
   - **Application Name**: Choose any name
   - **Category**: Choose appropriate category
   - **Website**: Your website or localhost
   - **Authorization Callback Domain**: Your server domain (e.g., `yourdomain.com` or use `localhost` for testing)
3. Note down your **Client ID** and **Client Secret**

### 2. Get Strava Access Token

You need to authorize your application to access your Strava data:

1. Replace `YOUR_CLIENT_ID` in the URL below and visit it in your browser:
   ```
   https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/exchange_token&approval_prompt=force&scope=activity:read_all
   ```

2. Authorize the application. You'll be redirected to a URL with a `code` parameter.

3. Exchange the code for an access token using curl (replace `YOUR_CLIENT_ID`, `YOUR_CLIENT_SECRET`, and `YOUR_CODE`):
   ```bash
   curl -X POST https://www.strava.com/oauth/token \
     -d client_id=YOUR_CLIENT_ID \
     -d client_secret=YOUR_CLIENT_SECRET \
     -d code=YOUR_CODE \
     -d grant_type=authorization_code
   ```

4. Save the `access_token` from the response.

### 3. Google Sheets Setup

#### Create a Google Cloud Project and Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the details and click "Create"
   - Skip optional steps and click "Done"

5. Create a key for the Service Account:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the key file and save it as `google-credentials.json` in the project root

6. Copy the service account email (looks like `name@project.iam.gserviceaccount.com`)

#### Create and Share the Google Sheet

1. Create a new Google Sheet
2. Note the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```
3. Share the sheet with the service account email (give it "Editor" access)

### 4. Project Setup

1. Clone this repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Fill in your `.env` file:
   ```env
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   STRAVA_VERIFY_TOKEN=any_random_string_you_choose
   STRAVA_ACCESS_TOKEN=access_token_from_step_2
   
   GOOGLE_SHEETS_ID=your_spreadsheet_id
   
   PORT=3000
   WEBHOOK_CALLBACK_URL=https://your-domain.com/webhook
   ```

4. Place your `google-credentials.json` file in the project root

### 5. Deploy Your Server

You need a publicly accessible URL for Strava to send webhooks. Options:

#### Option A: Deploy to a Cloud Provider
- Deploy to platforms like Heroku, Railway, Render, or DigitalOcean
- Use your deployed URL as the `WEBHOOK_CALLBACK_URL`

#### Option B: Use ngrok for Local Testing
1. Install [ngrok](https://ngrok.com/)
2. Start your server: `npm start`
3. In another terminal: `ngrok http 3000`
4. Use the ngrok HTTPS URL as your `WEBHOOK_CALLBACK_URL`

### 6. Subscribe to Strava Webhooks

After your server is running and publicly accessible:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d callback_url=YOUR_WEBHOOK_CALLBACK_URL \
  -d verify_token=YOUR_VERIFY_TOKEN
```

Verify the subscription:
```bash
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Testing

1. Start your server
2. Upload a new activity to Strava (or edit an existing one)
3. Check your Google Sheet - the new activity should appear automatically!

## Troubleshooting

### Webhook not receiving events
- Ensure your server is publicly accessible
- Check that the webhook subscription is active (use the verify curl command)
- Check server logs for errors

### Google Sheets errors
- Verify the service account has "Editor" access to the sheet
- Ensure `google-credentials.json` is in the correct location
- Check the spreadsheet ID in your `.env` file

### Strava API errors
- Verify your access token is valid
- Check that you have the correct scopes (`activity:read_all`)
- Access tokens expire - you may need to implement refresh token logic

## Data Captured

The Google Sheet will contain the following columns:
- **Date**: When the activity started
- **Activity Title**: Name of the activity
- **Notes**: Description/notes from Strava
- **Type**: Activity type (Run, Ride, Swim, etc.)
- **Distance**: Distance in kilometers
- **Duration**: Moving time in HH:MM:SS format

## Advanced: Token Refresh

For production use, implement OAuth refresh token logic to automatically refresh expired access tokens. The current implementation uses a single access token which will eventually expire.

## Security Notes

- Never commit `.env` or `google-credentials.json` to version control
- Use environment variables for all sensitive data
- Consider implementing rate limiting for webhook endpoints
- Use HTTPS for webhook callbacks in production

## License

MIT
