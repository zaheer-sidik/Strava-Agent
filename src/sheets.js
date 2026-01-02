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
 * @param {Array} values - Array of values to append [day, date, time, title, notes, type, distance, duration, activityId]
 */
export async function appendToSheet(values) {
  if (!sheets) {
    throw new Error('Google Sheets not initialized. Check credentials.');
  }

  try {
    // First, ensure the sheet structure exists
    await ensureDashboard();

    // Check if this activity ID already exists
    const activityId = values[8]; // Activity ID is the last element
    const checkResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!I10:I',
    });
    
    const existingIds = checkResponse.data.values || [];
    const existingRowIndex = existingIds.findIndex(row => row[0] === activityId);
    
    if (existingRowIndex !== -1) {
      const rowNumber = existingRowIndex + 10; // +10 because we start from row 10
      console.log(`Activity ID ${activityId} already exists at row ${rowNumber}, updating instead`);
      
      // Update the existing row instead of inserting
      const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A${rowNumber}:I${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });
      
      console.log(`Updated existing row ${rowNumber}: ${updateResponse.data.updatedRows} row(s) updated`);
      await updateDashboard();
      return updateResponse.data;
    }

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
            ['Last Activity:', '=IF(COUNTA(B10:B)>0,IF(TODAY()-B10=0,"Today",IF(TODAY()-B10=1,"Yesterday",TEXT(TODAY()-B10,"0")&" days ago")),"No activities yet")', '', '', '', '', '', '', ''],
            ['Week', '', '', 'Year', '', '', '', '', ''],
            ['Activities:', '=COUNTIFS(B10:B,">="&TODAY()-WEEKDAY(TODAY(),2)+1)', '', 'Activities:', '=COUNTIFS(B10:B,">="&DATE(YEAR(TODAY()),1,1))', '', '', '', ''],
            ['Distance:', '=SUMIF(B10:B,">="&TODAY()-WEEKDAY(TODAY(),2)+1,G10:G)', '', 'Distance:', '=SUMIF(B10:B,">="&DATE(YEAR(TODAY()),1,1),G10:G)', '', '', '', ''],
            ['Time:', '=TEXT(SUMIF(B10:B,">="&TODAY()-WEEKDAY(TODAY(),2)+1,H10:H),"[h]:mm")', '', 'Time:', '=TEXT(SUMIF(B10:B,">="&DATE(YEAR(TODAY()),1,1),H10:H),"[h]:mm")', 'Races:', '=SUMPRODUCT((B10:B>=DATE(YEAR(TODAY()),1,1))*(ISNUMBER(SEARCH("race",LOWER(D10:D))))*1)', ''],
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
            // Set Helvetica Neue as default font for entire sheet
            {
              repeatCell: {
                range: {
                  sheetId: 0
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      fontFamily: 'Helvetica Neue'
                    }
                  }
                },
                fields: 'userEnteredFormat.textFormat.fontFamily'
              }
            },
            // All dashboard rows (1-9) with grey background, bold, same font size
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 9,
                  startColumnIndex: 0,
                  endColumnIndex: 9
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 },
                    textFormat: { fontSize: 11, bold: true, fontFamily: 'Helvetica Neue' },
                    verticalAlignment: 'MIDDLE'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
              }
            },
            // Title row special formatting (row 1) - larger font and centered
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
                    textFormat: { fontSize: 16 },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(textFormat.fontSize,horizontalAlignment)'
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
            // Header row formatting (row 9) - white text on dark grey
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
                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 } },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat.foregroundColor,horizontalAlignment)'
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
 * Update Power of 10 personal bests section
 * @param {Object} pbsData - Personal bests data from Power of 10
 */
export async function updatePowerOf10Section(pbsData) {
  if (!sheets) {
    throw new Error('Google Sheets not initialized. Check credentials.');
  }

  try {
    if (!pbsData.success || !pbsData.personal_bests) {
      console.log('No Power of 10 data available');
      return;
    }

    // Prepare rows for common running distances
    const distances = ['800', '1500', '1M', '3000', '5000', '5K', '10K', '10000', 'Half', 'Mar'];
    const pbRows = [
      ['POWER OF 10 PBs'],
      ['Athlete:', pbsData.name || 'Unknown'],
      [''],
      ['Distance', 'Time', 'Venue', 'Date']
    ];

    // Add each distance
    for (const dist of distances) {
      const pb = pbsData.personal_bests[dist];
      if (pb) {
        pbRows.push([
          dist,
          pb.time || '',
          pb.venue || '',
          pb.date || ''
        ]);
      }
    }

    // Update the Power of 10 section (columns J-M, starting from row 1)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!J1:M${pbRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: pbRows,
      },
    });

    // Apply formatting to Power of 10 section
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          // Title row - dark background
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 9,
                endColumnIndex: 13
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.12, green: 0.12, blue: 0.12 },
                  textFormat: { 
                    fontFamily: 'Helvetica Neue',
                    fontSize: 12, 
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 }
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat'
            }
          },
          // Merge title cells
          {
            mergeCells: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 9,
                endColumnIndex: 13
              },
              mergeType: 'MERGE_ALL'
            }
          },
          // Athlete name row
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 1,
                endRowIndex: 2,
                startColumnIndex: 9,
                endColumnIndex: 13
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 1, green: 1, blue: 1 },
                  textFormat: { 
                    fontFamily: 'Helvetica Neue',
                    fontSize: 12,
                    foregroundColor: { red: 0.3, green: 0.3, blue: 0.3 }
                  },
                  horizontalAlignment: 'RIGHT'
                }
              },
              fields: 'userEnteredFormat'
            }
          },
          // Header row (row 4)
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 3,
                endRowIndex: 4,
                startColumnIndex: 9,
                endColumnIndex: 13
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.18, green: 0.18, blue: 0.18 },
                  textFormat: { 
                    fontFamily: 'Helvetica Neue',
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 11
                  },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat'
            }
          },
          // Data rows - alternating background
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 4,
                endRowIndex: pbRows.length,
                startColumnIndex: 9,
                endColumnIndex: 13
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.98, green: 0.98, blue: 0.98 },
                  textFormat: { 
                    fontFamily: 'Helvetica Neue',
                    fontSize: 10
                  },
                  horizontalAlignment: 'LEFT'
                }
              },
              fields: 'userEnteredFormat'
            }
          }
        ]
      }
    });

    console.log('Power of 10 section updated in Google Sheets');
  } catch (error) {
    console.error('Error updating Power of 10 section:', error.message);
    throw error;
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
