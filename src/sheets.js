import { google } from 'googleapis';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Initialize Google Sheets API
let sheets;

try {
  // Load service account credentials from environment variable or file
  let credentials;
  
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    // For production: decode from base64 environment variable
    const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
    credentials = JSON.parse(credentialsJson);
  } else {
    // For local development: read from file
    credentials = JSON.parse(readFileSync('./google-credentials.json', 'utf8'));
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheets = google.sheets({ version: 'v4', auth });
} catch (error) {
  console.error('Error loading Google credentials:', error.message);
  console.error('Make sure google-credentials.json exists or GOOGLE_CREDENTIALS_BASE64 is set');
}

/**
 * Append a row to the Google Sheet (inserts at row 2, right after headers)
 * @param {Array} values - Array of values to append [date, time, title, notes, type, distance, duration, activityId]
 */
export async function appendToSheet(values) {
  if (!sheets) {
    throw new Error('Google Sheets not initialized. Check credentials.');
  }

  try {
    // First, ensure the sheet has headers if it's empty
    await ensureHeaders();

    // Insert the new row at row 2 (right after headers)
    // This pushes existing data down
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
                startIndex: 1,
                endIndex: 2
              }
            }
          }
        ]
      }
    });

    // Now add the data to row 2
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:H2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    console.log(`Added row to Google Sheets: ${response.data.updatedRows} row(s) updated`);
    return response.data;
  } catch (error) {
    console.error('Error appending to sheet:', error.message);
    throw error;
  }
}

/**
 * Update an existing row in the Google Sheet by finding it via Activity ID
 * @param {string} activityId - The Strava activity ID to find
 * @param {Array} values - Array of values to update [date, time, title, notes, type, distance, duration, activityId]
 */
export async function updateSheetRow(activityId, values) {
  if (!sheets) {
    throw new Error('Google Sheets not initialized. Check credentials.');
  }

  try {
    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:H',
    });

    const rows = response.data.values || [];
    
    // Find the row index with matching activity ID (column H, index 7)
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) { // Start at 1 to skip header
      if (rows[i][7] === activityId) { // Column H (Activity ID)
        rowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      console.log(`Activity ID ${activityId} not found in sheet, adding as new row`);
      await appendToSheet(values);
      return;
    }

    // Update the found row
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!A${rowIndex}:H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    console.log(`Updated row ${rowIndex} in Google Sheets: ${updateResponse.data.updatedRows} row(s) updated`);
    return updateResponse.data;
  } catch (error) {
    console.error('Error updating sheet row:', error.message);
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
      range: 'Sheet1!A1:H1',
    });

    // If no data or empty, add headers
    if (!response.data.values || response.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A1:H1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Date', 'Time', 'Activity Title', 'Notes', 'Type', 'Distance', 'Duration', 'Activity ID']],
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
