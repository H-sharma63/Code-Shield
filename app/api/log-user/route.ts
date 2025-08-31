import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

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

const SPREADSHEET_ID = '1zqcXiQsIGJGXdGJedJVMlE7YipvAuZzSbg-MD29pyJM'; 
const SHEET_NAME = 'Sheet1'; 

export async function POST(req: NextRequest) {
  try {
    const { name, email, provider } = await req.json(); 
    console.log(''); 

    if (!name || !email || !provider) { 
      return NextResponse.json({ message: 'Name, email, and provider are required.' }, { status: 400 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:C`, 
    });

    const existingRows = response.data.values || [];
    const isDuplicate = existingRows.some(row => row[0] === name && row[1] === email && row[2] === provider);

    if (isDuplicate) {
      return NextResponse.json({ message: 'User already logged.' }, { status: 200 });
    }

    const values = [[name, email, provider]]; 
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:C`, 
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
