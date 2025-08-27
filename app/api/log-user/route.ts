import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

// Ensure your GOOGLE_SERVICE_ACCOUNT_CREDENTIALS are set in .env.local
const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;

if (!credentials) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable is not set.');
}

const serviceAccountAuth = new google.auth.JWT({
  email: JSON.parse(credentials).client_email,
  key: JSON.parse(credentials).private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth: serviceAccountAuth });

const SPREADSHEET_ID = '1zqcXiQsIGJGXdGJedJVMlE7YipvAuZzSbg-MD29pyJM'; // Your Google Sheet ID
const SHEET_NAME = 'Sheet1'; // The name of the sheet where you want to log users

export async function POST(req: NextRequest) {
  try {
    const { name, email, provider } = await req.json(); // Destructure provider
    console.log(''); // Debug log

    if (!name || !email || !provider) { // Provider is now also required
      return NextResponse.json({ message: 'Name, email, and provider are required.' }, { status: 400 });
    }

    // 1. Read existing data to check for duplicates
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:C`, // Read columns A, B, and C
    });

    const existingRows = response.data.values || [];
    // Check for duplicate based on name, email, AND provider
    const isDuplicate = existingRows.some(row => row[0] === name && row[1] === email && row[2] === provider);

    if (isDuplicate) {
      return NextResponse.json({ message: 'User already logged.' }, { status: 200 });
    }

    // 2. Append new data if not a duplicate
    const values = [[name, email, provider]]; // Include provider in values
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:C`, // Append to columns A, B, and C
      valueInputOption: 'RAW',
      requestBody: {
        values: values,
      },
    });

    return NextResponse.json({ message: 'User logged successfully.' }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error.' }, { status: 500 });
  }
}
