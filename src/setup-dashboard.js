import { google } from 'googleapis';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Initialize Google Sheets API
let sheets;

try {
  const credentials = JSON.parse(readFileSync('../google-credentials.json', 'utf8'));
  
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
    console.log('✓ Dashboard structure created');

    console.log('Applying formatting...');
    
    // Apply formatting
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          // Show gridlines and freeze rows
          {
            updateSheetProperties: {
              properties: {
                sheetId: 0,
                gridProperties: {
                  hideGridlines: false,
                  frozenRowCount: 9
                }
              },
              fields: 'gridProperties(hideGridlines,frozenRowCount)'
            }
          },
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
                  },
                  backgroundColor: { red: 0.98, green: 0.98, blue: 0.98 }
                }
              },
              fields: 'userEnteredFormat(textFormat.fontFamily,backgroundColor)'
            }
          },
          // Title row - modern gradient effect with large bold text
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
                  backgroundColor: { red: 0.12, green: 0.12, blue: 0.12 },
                  textFormat: { 
                    fontFamily: 'Helvetica Neue',
                    fontSize: 12, 
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 }
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  padding: {
                    top: 20,
                    bottom: 20
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
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
          // Last Activity row (row 2) - clean white card effect
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 1,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: 9
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 1, green: 1, blue: 1 },
                  textFormat: { 
                    fontFamily: 'Helvetica Neue',
                    fontSize: 12,
                    foregroundColor: { red: 0.3, green: 0.3, blue: 0.3 }
                  },
                  horizontalAlignment: 'RIGHT',
                  verticalAlignment: 'MIDDLE',
                  padding: {
                    top: 12,
                    bottom: 12,
                    left: 12
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
            }
          },
          // Section headers "Week" and "Year" (row 3)
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 2,
                endRowIndex: 3,
                startColumnIndex: 0,
                endColumnIndex: 9
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                  textFormat: { 
                    fontFamily: 'Helvetica Neue',
                    fontSize: 12,
                    bold: true,
                    foregroundColor: { red: 0.5, green: 0.5, blue: 0.5 }
                  },
                  horizontalAlignment: 'RIGHT',
                  verticalAlignment: 'MIDDLE',
                  padding: {
                    top: 6,
                    bottom: 6,
                    left: 12
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
            }
          },
          // Stat cards (rows 4-6) - white cards with subtle shadow effect
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 3,
                endRowIndex: 6,
                startColumnIndex: 0,
                endColumnIndex: 9
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 1, green: 1, blue: 1 },
                  textFormat: { 
                    fontFamily: 'Helvetica Neue',
                    fontSize: 12
                  },
                  horizontalAlignment: 'RIGHT',
                  verticalAlignment: 'MIDDLE',
                  padding: {
                    top: 10,
                    bottom: 10,
                    left: 12
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
            }
          },
          // Stat labels bold (columns A, D, F)
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 3,
                endRowIndex: 6,
                startColumnIndex: 0,
                endColumnIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { 
                    bold: true,
                    foregroundColor: { red: 0.2, green: 0.2, blue: 0.2 }
                  }
                }
              },
              fields: 'userEnteredFormat.textFormat'
            }
          },
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 3,
                endRowIndex: 6,
                startColumnIndex: 3,
                endColumnIndex: 4
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { 
                    bold: true,
                    foregroundColor: { red: 0.2, green: 0.2, blue: 0.2 }
                  }
                }
              },
              fields: 'userEnteredFormat.textFormat'
            }
          },
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 3,
                endRowIndex: 6,
                startColumnIndex: 5,
                endColumnIndex: 6
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { 
                    bold: true,
                    foregroundColor: { red: 0.2, green: 0.2, blue: 0.2 }
                  }
                }
              },
              fields: 'userEnteredFormat.textFormat'
            }
          },
          // Stat values with accent color (columns B, E, G)
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 3,
                endRowIndex: 6,
                startColumnIndex: 1,
                endColumnIndex: 2
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { 
                    bold: true,
                    fontSize: 12,
                    foregroundColor: { red: 0.99, green: 0.46, blue: 0.19 }
                  }
                }
              },
              fields: 'userEnteredFormat.textFormat'
            }
          },
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 3,
                endRowIndex: 6,
                startColumnIndex: 4,
                endColumnIndex: 5
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { 
                    bold: true,
                    fontSize: 12,
                    foregroundColor: { red: 0.99, green: 0.46, blue: 0.19 }
                  }
                }
              },
              fields: 'userEnteredFormat.textFormat'
            }
          },
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 3,
                endRowIndex: 6,
                startColumnIndex: 6,
                endColumnIndex: 7
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { 
                    bold: true,
                    fontSize: 12,
                    foregroundColor: { red: 0.99, green: 0.46, blue: 0.19 }
                  }
                }
              },
              fields: 'userEnteredFormat.textFormat'
            }
          },
          // Header row (row 9) - dark with uppercase-feel
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
                  backgroundColor: { red: 0.18, green: 0.18, blue: 0.18 },
                  textFormat: { 
                    fontFamily: 'Helvetica Neue',
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 12
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  padding: {
                    top: 10,
                    bottom: 10
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
            }
          },
          // Add subtle borders to stat cards
          {
            updateBorders: {
              range: {
                sheetId: 0,
                startRowIndex: 1,
                endRowIndex: 6,
                startColumnIndex: 0,
                endColumnIndex: 9
              },
              top: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.9, green: 0.9, blue: 0.9 }
              },
              bottom: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.9, green: 0.9, blue: 0.9 }
              }
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
