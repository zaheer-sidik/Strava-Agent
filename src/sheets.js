import { google } from 'googleapis';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Initialize Google Sheets API
let sheets;

try {
  // Load service account credentials
  const credentials = JSON.parse(readFileSync('./google-credentials.json', 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheets = google.sheets({ version: 'v4', auth });
} catch (error) {
  console.error('Error loading Google credentials:', error.message);
  console.error('Make sure google-credentials.json exists in the project root');
}

/**
 * Append a row to the Google Sheet
 * @param {Array} values - Array of values to append [date, time, title, notes, type, distance, duration]
 */
export async function appendToSheet(values) {
  if (!sheets) {
    throw new Error('Google Sheets not initialized. Check credentials.');
  }

  try {
    // First, ensure the sheet has headers if it's empty
    await ensureHeaders();

    // Append the new row
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:G', // Adjust sheet name if needed
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    console.log(`Added row to Google Sheets: ${response.data.updates.updatedRows} row(s) updated`);
    return response.data;
  } catch (error) {
    console.error('Error appending to sheet:', error.message);
    throw error;
  }
}

/**
 * Ensure the sheet has proper headers
 */
async function ensureHeaders() {
  try {
    // Check if first row has data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:G1',
    });

    // If no data or empty, add headers
    if (!response.data.values || response.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Date', 'Time', 'Activity Title', 'Notes', 'Type', 'Distance', 'Duration']],
        },
      });
      console.log('Headers added to Google Sheets');
    }
  } catch (error) {
    console.error('Error checking/adding headers:', error.message);
  }
}

/**
 * Test the Google Sheets connection
 */
export async function testConnection() {
  if (!sheets) {
    throw new Error('Google Sheets not initialized');
  }

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    console.log('Successfully connected to Google Sheets:', response.data.properties.title);
    return true;
  } catch (error) {
    console.error('Error connecting to Google Sheets:', error.message);
    throw error;
  }
}
