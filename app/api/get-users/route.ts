
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from 'next-auth/react';

const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;

if (!credentials) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable is not set.');
}

const serviceAccountAuth = new google.auth.JWT({
  email: JSON.parse(credentials).client_email,
  key: JSON.parse(credentials).private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth: serviceAccountAuth });

const SPREADSHEET_ID = '1zqcXiQsIGJGXdGJedJVMlE7YipvAuZzSbg-MD29pyJM'; 
const SHEET_NAME = 'Sheet1'; 

export async function GET(req: NextRequest) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:C`,
    });

    const rows = response.data.values || [];
    // Skip the header row by slicing the array from the second element
    const users = rows.slice(1).map(row => ({
      name: row[0],
      email: row[1],
      provider: row[2],
    }));

    return NextResponse.json({ users }, { status: 200 });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Internal Server Error.' }, { status: 500 });
  }
}
