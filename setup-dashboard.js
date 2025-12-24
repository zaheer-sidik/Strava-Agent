import { google } from 'googleapis';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Initialize Google Sheets API
let sheets;

try {
  const credentials = JSON.parse(readFileSync('./google-credentials.json', 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheets = google.sheets({ version: 'v4', auth });
  console.log('✓ Google Sheets API initialized');
} catch (error) {
  console.error('Error loading Google credentials:', error.message);
  process.exit(1);
}

async function createDashboard() {
  try {
    console.log('Creating dashboard structure...');
    
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
    console.log('✓ Dashboard structure created');

    console.log('Applying formatting...');
    
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
          // Bold stat labels (column A)
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
          // Bold stat labels (column C)
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
          // Bold stat labels (column E)
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
    
    console.log('✓ Formatting applied');
    console.log('\n✅ Dashboard created successfully!');
    console.log('Check your Google Sheet - rows 1-9 now contain the dashboard.');
    console.log('Your activity data starting from row 10 should remain intact.');
    
  } catch (error) {
    console.error('❌ Error creating dashboard:', error.message);
    process.exit(1);
  }
}

// Run the function
createDashboard();
