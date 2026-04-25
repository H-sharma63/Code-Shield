import { NextRequest, NextResponse } from 'next/server';
import { callVertexAI } from '@/app/lib/ai/vertex-service';

const DEBUG_SIMULATION_PROMPT = `
You are the CodeShield Neural Debugger. Your task is to perform a high-fidelity "dry run" of the provided code.
You must simulate the execution step-by-step and return a JSON array representing the trace.

STRICT RULES:
1. Return ONLY valid JSON. No markdown blocks.
2. Identify the entry point of the code.
3. For each significant execution step, provide:
   - "line": The line number in the source code.
   - "function": The name of the function being executed.
   - "file": The file name.
   - "variables": An object containing the current state of variables. Use "null" or "undefined" literally if they haven't been assigned.
   - "action": A short description of what is happening (e.g., "Initializing variable", "Calling API", "Returning value").

Example Output:
{
  "steps": [
    {
      "line": 10,
      "function": "fetchData",
      "file": "api.ts",
      "variables": { "id": 123, "data": null },
      "action": "Starting fetch request"
    },
    ...
  ]
}
`;

export async function POST(req: NextRequest) {
  try {
    const { code, filename, modelId } = await req.json();

    if (!code) {
      return NextResponse.json({ message: 'Code is required for simulation' }, { status: 400 });
    }

    const context = `
File: ${filename}
Code:
${code}
`;

    const aiResponse = await callVertexAI(
      'google', 
      modelId || 'gemini-2.0-flash-001', 
      context, 
      DEBUG_SIMULATION_PROMPT, 
      'json'
    );

    // Clean up response
    const rawJsonStr = aiResponse.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    const data = JSON.parse(rawJsonStr);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("[DEBUG_SIMULATE] Failure:", error);
    return NextResponse.json({ message: error.message || 'Simulation failed' }, { status: 500 });
  }
}
