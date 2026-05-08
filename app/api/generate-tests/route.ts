import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
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
IMPORTANT: The 'input' and 'expectedOutput' MUST be literal values (strings, numbers, booleans, arrays, or objects). 
DO NOT use Python expressions like '"..." * 5000' or variables inside the JSON.
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
        // Use the newly registered Gemini 3.1 Pro Preview
        responseContent = await callVertexAI('google', 'gemini-3.1-pro-preview', userPrompt, systemPrompt, 'json');
    } catch (error: any) {
        responseContent = await callGeminiFallback(userPrompt, systemPrompt, 'json');
    }

    // Clean up markdown and common AI expressions that break JSON.parse
    let cleanedJson = responseContent.replace(/```json\n?|```/gi, '').trim();

    // 🛡️ ADVANCED CLEANUP: Fix expressions that break JSON.parse
    // 1. Handle "str" * 10
    cleanedJson = cleanedJson.replace(/"([^"]+)"\s*\*\s*(\d+)/g, (match, str, count) => {
        try { return JSON.stringify(str.repeat(parseInt(count))); } catch (e) { return match; }
    });

    // 2. Handle "str".repeat(10)
    cleanedJson = cleanedJson.replace(/"([^"]+)"\.repeat\((\d+)\)/g, (match, str, count) => {
        try { return JSON.stringify(str.repeat(parseInt(count))); } catch (e) { return match; }
    });

    // 3. Handle simple concatenation "a" + "b"
    cleanedJson = cleanedJson.replace(/"([^"]+)"\s*\+\s*"([^"]+)"/g, (match, s1, s2) => `"${s1}${s2}"`);
    
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
