
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { code, language_id, stdin } = await req.json();

  const submissionOptions = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': process.env.JUDGE0_RAPIDAPI_KEY!,
      'X-RapidAPI-Host': process.env.JUDGE0_RAPIDAPI_HOST!
    },
    body: JSON.stringify({
      language_id: language_id,
      source_code: code,
      stdin: stdin
    })
  };

  try {
    const submissionResponse = await fetch('https://judge0-ce.p.rapidapi.com/submissions', submissionOptions);
    const submissionResult = await submissionResponse.json();
    console.log('Submission Result:', submissionResult);
    const { token } = submissionResult;

    if (!token) {
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
    }

    let resultResponse;
    let resultData;
    let statusId = 1; // In Queue

    const getOptions = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': process.env.JUDGE0_RAPIDAPI_KEY!,
            'X-RapidAPI-Host': process.env.JUDGE0_RAPIDAPI_HOST!
        }
    };

    while (statusId === 1 || statusId === 2) { // 1: In Queue, 2: Processing
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
      resultResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, getOptions);
      resultData = await resultResponse.json();
      console.log('Result Data:', resultData);
      statusId = resultData.status.id;
    }

    return NextResponse.json(resultData);

  } catch (error) {
    return NextResponse.json({ error: 'Failed to run code' }, { status: 500 });
  }
}
