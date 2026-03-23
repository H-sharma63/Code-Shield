import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { code, language_id, stdin } = await req.json();

    const submissionOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_code: code,
        language_id,
        stdin: stdin || "",
      }),
    };

    // Use the official Judge0 public instance (Higher rate limits and no RapidAPI requirement for basic tests)
    const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
        ...submissionOptions,
        headers: {
            ...submissionOptions.headers,
            'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY as string,
            'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
        }
    });
    
    // FALLBACK: If RapidAPI fails, try the alternative public server
    let resultData = await response.json();
    
    if (resultData.message === 'You are not subscribed to this API.') {
        console.warn("[RUN_CODE_API] RapidAPI subscription error. Falling back to public mirror...");
        const fallbackResponse = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', submissionOptions);
        resultData = await fallbackResponse.json();
    }

    console.log("[RUN_CODE_API] Judge0 Result:", resultData);
    return NextResponse.json(resultData);

  } catch (error) {
    console.error("Run Code Error:", error);
    return NextResponse.json({ error: 'Failed to run code' }, { status: 500 });
  }
}
