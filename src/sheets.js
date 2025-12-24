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
 * Append a row to the Google Sheet (inserts at row 10, right after dashboard)
 * @param {Array} values - Array of values to append [date, time, title, notes, type, distance, duration, activityId]
 */
export async function appendToSheet(values) {
  if (!sheets) {
    throw new Error('Google Sheets not initialized. Check credentials.');
  }

  try {
    // First, ensure the sheet structure exists
    await ensureDashboard();

    // Insert the new row at row 10 (right after dashboard and headers)
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
                startIndex: 9,
                endIndex: 10
              }
            }
          }
        ]
      }
    });

    // Now add the data to row 10
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A10:I10',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    console.log(`Added row to Google Sheets: ${response.data.updatedRows} row(s) updated`);
    
    // Update dashboard stats after adding new activity
    await updateDashboard();
    
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
    // Get all data from the sheet (starting from row 9 to skip dashboard)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A9:I',
    });

    const rows = response.data.values || [];
    
    // Find the row index with matching activity ID (column I, index 8)
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) { // Start at 1 to skip activity header (row 9)
      if (rows[i][8] === activityId) { // Column I (Activity ID)
        rowIndex = i + 9; // +9 because we started from row 9
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
      range: `Sheet1!A${rowIndex}:I${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    console.log(`Updated row ${rowIndex} in Google Sheets: ${updateResponse.data.updatedRows} row(s) updated`);
    
    // Update dashboard stats after updating activity
    await updateDashboard();
    
    return updateResponse.data;
  } catch (error) {
    console.error('Error updating sheet row:', error.message);
    throw error;
  }
}

/**
 * Create and format the dashboard at the top of the sheet
 */
async function ensureDashboard() {
  try {
    // Check if dashboard exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:H1',
    });

    // If no data, create the full dashboard structure
    if (!response.data.values || response.data.values.length === 0) {
      // Create dashboard and headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A1:I9',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['STRAVA DASHBOARD', '', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '', ''],
            ['Last Activity:', '=IF(COUNTA(B10:B)>0,B10,"No activities yet")', 'Activities This Week:', '=COUNTIFS(B10:B,">="&TODAY()-WEEKDAY(TODAY(),2)+1)', 'Activities This Year:', '=COUNTIFS(B10:B,">="&DATE(YEAR(TODAY()),1,1))', '', '', ''],
            ['Total Distance (This Week):', '=SUMIF(B10:B,">="&TODAY()-WEEKDAY(TODAY(),2)+1,G10:G)', 'Total Distance (This Year):', '=SUMIF(B10:B,">="&DATE(YEAR(TODAY()),1,1),G10:G)', 'Total Activities:', '=COUNTA(B10:B)', '', '', ''],
            ['Races This Year:', '=SUMPRODUCT((B10:B>=DATE(YEAR(TODAY()),1,1))*(ISNUMBER(SEARCH("race",LOWER(D10:D))))*1)', 'Average Distance:', '=IF(COUNTA(G10:G)>0,AVERAGE(G10:G),"N/A")', 'Most Common Activity:', '=IF(COUNTA(F10:F)>0,INDEX(F10:F,MODE(MATCH(F10:F,F10:F,0))),"N/A")', '', '', ''],
            ['', '', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '', ''],
            ['Day', 'Date', 'Time', 'Activity Title', 'Notes', 'Type', 'Distance', 'Duration', 'Activity ID'],
          ],
        },
      });

      // Apply formatting
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            // Title row formatting (row 1)
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 9
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 16, bold: true },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
              }
            },
            // Merge title cells
            {
              mergeCells: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 9
                },
                mergeType: 'MERGE_ALL'
              }
            },
            // Stats rows formatting (rows 3-5)
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 2,
                  endRowIndex: 5,
                  startColumnIndex: 0,
                  endColumnIndex: 9
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                    textFormat: { fontSize: 11 },
                    verticalAlignment: 'MIDDLE'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
              }
            },
            // Bold stat labels
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 2,
                  endRowIndex: 5,
                  startColumnIndex: 0,
                  endColumnIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true }
                  }
                },
                fields: 'userEnteredFormat.textFormat.bold'
              }
            },
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 2,
                  endRowIndex: 5,
                  startColumnIndex: 2,
                  endColumnIndex: 3
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true }
                  }
                },
                fields: 'userEnteredFormat.textFormat.bold'
              }
            },
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 2,
                  endRowIndex: 5,
                  startColumnIndex: 4,
                  endColumnIndex: 5
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true }
                  }
                },
                fields: 'userEnteredFormat.textFormat.bold'
              }
            },
            // Header row formatting (row 9)
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 8,
                  endRowIndex: 9,
                  startColumnIndex: 0,
                  endColumnIndex: 9
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.3, green: 0.3, blue: 0.3 },
                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            },
            // Freeze dashboard and header rows
            {
              updateSheetProperties: {
                properties: {
                  sheetId: 0,
                  gridProperties: {
                    frozenRowCount: 9
                  }
                },
                fields: 'gridProperties.frozenRowCount'
              }
            },
            // Set column widths
            {
              updateDimensionProperties: {
                range: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 1
                },
                properties: {
                  pixelSize: 150
                },
                fields: 'pixelSize'
              }
            },
            {
              updateDimensionProperties: {
                range: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 2,
                  endIndex: 3
                },
                properties: {
                  pixelSize: 200
                },
                fields: 'pixelSize'
              }
            }
          ]
        }
      });

      console.log('Dashboard created in Google Sheets');
    }
  } catch (error) {
    console.error('Error creating dashboard:', error.message);
  }
}

/**
 * Update dashboard with latest statistics
 */
async function updateDashboard() {
  try {
    // Dashboard updates automatically via formulas, but we can trigger a refresh
    // by reading the values (formulas will recalculate)
    await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:H9',
    });
    
    console.log('Dashboard refreshed');
  } catch (error) {
    console.error('Error updating dashboard:', error.message);
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
