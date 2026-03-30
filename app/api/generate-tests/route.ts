import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { callVertexAI, callGeminiFallback } from '@/app/lib/ai/vertex-service';

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { code, language = 'python' } = await req.json();

    if (!code) {
      return NextResponse.json({ message: 'Code is required.' }, { status: 400 });
    }

    const systemPrompt = `You are a professional AI test automation engineer.
Analyze the given code and generate exactly 8-10 comprehensive test cases.
You MUST return ONLY valid JSON, no markdown, no explanation.
Cover these specific types: happy_path, edge_case, boundary, negative, invalid_input.

Return this EXACT JSON shape:
{
  "functionName": "the_primary_function_name",
  "testCases": [
    { "id": 1, "type": "happy_path", "description": "Short description", "input": [args], "expectedOutput": "value_or_error" }
  ]
}`;

    const userPrompt = `Generate test cases for this ${language} code:\n\n${code}`;

    let responseContent: string;
    try {
        // Default to gemini-1.5-pro for high-fidelity test generation
        responseContent = await callVertexAI('google', 'gemini-1.5-pro-002', userPrompt, systemPrompt, 'json');
    } catch (error: any) {
        responseContent = await callGeminiFallback(userPrompt, systemPrompt, 'json');
    }

    // Clean up any potential markdown fluff
    const cleanedJson = responseContent.replace(/```json\n/i, '').replace(/```\n/i, '').replace(/\n```/i, '').trim();
    
    try {
        const parsedData = JSON.parse(cleanedJson);
        return NextResponse.json(parsedData);
    } catch (parseError) {
        console.error("JSON Parse Error during Test Gen:", cleanedJson);
        return NextResponse.json({ 
            message: 'Failed to parse AI generated tests.', 
            raw: cleanedJson 
        }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Test Generation Error:', error);
    return NextResponse.json({ 
      message: 'Failed to generate tests.', 
      error: error.message 
    }, { status: 500 });
  }
}
