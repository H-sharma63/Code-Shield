import { NextRequest, NextResponse } from 'next/server';
import { callVertexAI, callGeminiFallback } from '@/app/lib/ai/vertex-service';
import { callOpenRouter } from '@/app/lib/ai/openrouter-service';

// --- REGISTERED VERTEX MODELS ONLY ---
const VERTEX_MODELS: Record<string, { type: 'google' | 'anthropic' | 'mistral'; apiModel: string }> = {
  'claude-3.7-sonnet': { type: 'anthropic', apiModel: 'claude-3-7-sonnet@20250219' },
  'claude-3.5-sonnet': { type: 'anthropic', apiModel: 'claude-3-5-sonnet@20240620' },
  'claude-4.0-opus': { type: 'anthropic', apiModel: 'claude-opus-4' },
  'claude-4.1-opus': { type: 'anthropic', apiModel: 'claude-opus-4-1' },
  'mistral-codestral2': { type: 'mistral', apiModel: 'codestral-2' },
  'gemini-2.5-pro': { type: 'google', apiModel: 'gemini-2.5-pro' },
  'gemini-3-pro-preview': { type: 'google', apiModel: 'gemini-3-pro-preview' },
  'gemini-3.1-pro-preview': { type: 'google', apiModel: 'gemini-3.1-pro-preview' },
  'gemini-test': { type: 'google', apiModel: 'gemini-2.0-flash' },
};

export async function POST(req: NextRequest) {
  try {
    const { code, analysisType, modelId = 'gemini-test' } = await req.json();
    if (!code) return NextResponse.json({ message: 'Code is required.' }, { status: 400 });

    const systemPromptText = systemPrompt(analysisType);
    let responseContent: string;
    let finalModelName = modelId;

    const vertexConfig = VERTEX_MODELS[modelId];

    if (vertexConfig) {
      try {
        responseContent = await callVertexAI(vertexConfig.type, vertexConfig.apiModel, code, systemPromptText);
        finalModelName = vertexConfig.apiModel;
      } catch (error: any) {
        responseContent = await callGeminiFallback(code, systemPromptText);
        finalModelName = 'gemini-2.0-flash (Fallback)';
      }
    } else {
      responseContent = await callOpenRouter(modelId, code, systemPromptText);
    }

    // --- "UNBREAKABLE" PARSER ---
    let content = responseContent.replace(/```json|```/g, '').trim();
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');

    if (start === -1 || end === -1) throw new Error("Invalid AI response format");
    let jsonStr = content.substring(start, end + 1);

    try {
        const parsed = JSON.parse(jsonStr);
        // --- AUTOMATIC INJECTION FOR AUDIT ---
        if (analysisType === 'audit' && parsed.auditCode) {
            const codeB64 = Buffer.from(code).toString('base64');
            const injection = `import base64\nwith open("subject.src", "wb") as f: f.write(base64.b64decode("${codeB64}"))\n\n`;
            parsed.auditCode = injection + parsed.auditCode;
        }
        return NextResponse.json({ ...parsed, model: finalModelName });
    } catch (e: any) {
        console.error("[SIMPLE_PARSER_FAILED] Error:", e.message);
        console.error("Failed on:", jsonStr.substring(0, 200));
        return NextResponse.json({ message: 'AI response parsing failed.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`[CONTROLLER_ERROR]`, error.message);
    return NextResponse.json({ message: 'AI processing failed', details: error.message }, { status: 500 });
  }
}

function systemPrompt(type: string) {
    if (type === 'debug') {
        return `You are an expert AI code debugger. Analyze the code and provide suggestions on how to debug it. Return a valid JSON object with keys: "explanation" (string) and "suggestions" (array of strings). Do not include markdown formatting.`;
    }
    if (type === 'audit') {
        return `You are an expert software quality auditor. Your goal is to generate a comprehensive 4-tier testing audit script in Python.
        
        CRITICAL INSTRUCTIONS:
        1. The user's code is in a file named "subject.src".
        2. You MUST first determine if the code is Python. If it contains non-Python keywords like "import React", "const", or "function", you MUST ONLY perform static analysis by reading "subject.src" as a string.
        3. Do NOT attempt to run or import "subject.src" if it is not Python. This will cause a SyntaxError.
        4. If it IS Python, you may rename it to "subject.py" and import it for dynamic tests.
        5. VERBOSE OUTPUT: You MUST use print() statements to report results for all 4 tiers.
        
        Tiers: Unit (Logic), Integration (Interactions), Security (Vulnerabilities), Performance (Efficiency).
        
        Return a valid JSON object with keys: "explanation", "auditCode", "report". Do not include markdown formatting.`;
    }
    return `You are an expert AI code reviewer. Analyze the code and provide a brief, high-level explanation, followed by actionable suggestions. Return a valid JSON object with keys: "explanation" (string) and "suggestions" (array of strings). Do not include markdown formatting.`;
}
