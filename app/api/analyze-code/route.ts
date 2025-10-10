import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client to connect to OpenRouter
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { code, analysisType } = await req.json();

    if (!code) {
      return NextResponse.json({ message: 'Code is required.' }, { status: 400 });
    }

    let systemPrompt = `You are an expert AI code reviewer. Analyze the user's code and provide a brief, high-level explanation of what it does, followed by a list of actionable suggestions for improvement. Return your response as a valid JSON object with two keys: "explanation" (a string) and "suggestions" (an array of strings). Do not include any other text or markdown formatting in your response.`;

    if (analysisType === 'debug') {
      systemPrompt = `You are an expert AI code debugger. Analyze the user's code and provide suggestions on how to debug it. The user is looking for help in finding and fixing potential bugs. Provide a list of actionable suggestions for debugging. Return your response as a valid JSON object with two keys: "explanation" (a string explaining the potential issues) and "suggestions" (an array of strings with debugging steps). Do not include any other text or markdown formatting in your response.`;
    }

    const model = 'openai/gpt-5-codex';
    const completion = await openrouter.chat.completions.create({
      model, // Using the specialized code model
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: code,
        },
      ],
      response_format: { type: 'json_object' }, // Ensure the response is JSON
    });

    const responseContent = completion.choices[0].message.content;

    if (!responseContent) {
      return NextResponse.json({ message: 'Failed to get a valid response from the AI model.' }, { status: 500 });
    }

    // The model should return a valid JSON string, so we parse it.
    const analysis = JSON.parse(responseContent);

    return NextResponse.json({ ...analysis, model }, { status: 200 });

  } catch (error: any) {
    console.error('Error analyzing code:', error);
    // Check for API-specific errors
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      return NextResponse.json({ message: `API Error: ${error.response.data.error.message}` }, { status: error.response.status });
    }
    return NextResponse.json({ message: 'Internal Server Error.' }, { status: 500 });
  }
}
