import { NextRequest, NextResponse } from 'next/server';
import { callVertexAI, callGeminiFallback } from '@/app/lib/ai/vertex-service';
import { callOpenRouter } from '@/app/lib/ai/openrouter-service';

// --- REGISTERED VERTEX MODELS ONLY ---
const VERTEX_MODELS: Record<string, { type: 'google' | 'anthropic' | 'mistral'; apiModel: string }> = {
  'gemini-3.1-pro-preview': { type: 'google', apiModel: 'gemini-3.1-pro-preview' },
  'mistral-codestral2': { type: 'mistral', apiModel: 'codestral-2' },
  'gemini-test': { type: 'google', apiModel: 'gemini-3.1-pro-preview' },
};


export async function POST(req: NextRequest) {
  try {
    const { code, analysisType, modelId = 'gemini-test', context = '' } = await req.json();
    if (!code) return NextResponse.json({ message: 'Code is required.' }, { status: 400 });

    const systemPromptText = systemPrompt(analysisType, !!context);

    // Combine context with code for analysis
    const fullPrompt = context
      ? `--- START OF PROJECT WORKSPACE CONTEXT ---\n${context}\n--- END OF PROJECT WORKSPACE CONTEXT ---\n\n--- FILE FOR SPECIFIC ATTENTION (OPTIONAL) ---\n${code}\n\nINSTRUCTION: Using the Project Workspace Context provided above, perform a project-wide architectural analysis. Focus on cross-file dependencies, system-wide patterns, and overall project health. Use the 'FILE FOR SPECIFIC ATTENTION' as a starting point or a specific example within the project.`
      : code;

    let responseContent: string;
    let finalModelName = modelId;

    const vertexConfig = VERTEX_MODELS[modelId];

    if (vertexConfig) {
      try {
        responseContent = await callVertexAI(vertexConfig.type, vertexConfig.apiModel, fullPrompt, systemPromptText, 'json');
        finalModelName = vertexConfig.apiModel;
      } catch (error: any) {
        responseContent = await callGeminiFallback(fullPrompt, systemPromptText, 'json');
        finalModelName = 'gemini-2.0-flash (Fallback)';
      }
    } else {
      responseContent = await callOpenRouter(modelId, fullPrompt, systemPromptText);
    }

    // --- "UNBREAKABLE" PARSER ---
    let strResponse = typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent);
    let content = strResponse.replace(/```json|```/g, '').trim();
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');

    if (start === -1 || end === -1) throw new Error("Invalid AI response format");
    let jsonStr = content.substring(start, end + 1);

    try {
      const parsed = JSON.parse(jsonStr);
      // --- AUTOMATIC INJECTION FOR AUDIT ---
      if (analysisType === 'audit' && parsed.testSuite) {
        const codeB64 = Buffer.from(code).toString('base64');
        const injection = `import base64\nwith open("subject_code.py", "wb") as f: f.write(base64.b64decode("${codeB64}"))\n\n`;
        parsed.testSuite = injection + parsed.testSuite;
      }
      return NextResponse.json({ ...parsed, model: finalModelName });
    } catch (e: any) {
      console.error("[SIMPLE_PARSER_FAILED] Error:", e.message);
      return NextResponse.json({ message: 'AI response parsing failed.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error(`[CONTROLLER_ERROR]`, error.message);
    return NextResponse.json({ message: 'AI processing failed', details: error.message }, { status: 500 });
  }
}

function systemPrompt(type: string, hasContext: boolean) {
  const contextInstruction = hasContext
    ? " You have been provided with the COMPLETE PROJECT WORKSPACE CONTEXT (File Tree + Source Code of multiple files). Your primary goal is to perform a PROJECT-WIDE analysis. Do not just focus on a single file; instead, look at how different components, services, and configurations interact across the entire repository."
    : " Analyze the provided code snippet.";

  if (type === 'debug') {
    return `You are an expert AI code debugger.${contextInstruction} Analyze the code and provide suggestions on how to debug it, considering its role in the project. Return a valid JSON object with keys: "explanation" (string) and "suggestions" (array of strings). Do not include markdown formatting.`;
  }
  if (type === 'audit') {
    return `You are an autonomous AI Testing Agent called 'The Sprite'.${contextInstruction} Your mission is to explore the provided code, identify critical risks, and generate a VEIRFIABLE test suite as proof.
        
        CRITICAL AGENT INSTRUCTIONS:
        1. "Explore" the code as an agent would. Describe your process in "Discoveries".
        2. You must generate 5-10 specific "Mission Discoveries" for the requested tier.
        3. For each Discovery, determine if the mission "Passed" or "Failed".
        4. MANDATORY: Generate a "testSuite" (Python string) using 'unittest' or 'pytest'.
        5. This "testSuite" MUST import the provided code (named "subject_code.py") using 'import subject_code'.
        6. The test must fail if the discovered vulnerabilities exist.
        
        Return a valid JSON object with: 
        "explanation" (short mission summary), 
        "report": { "unit": [], "integration": [], "security": [], "performance": [] },
        "testSuite": "PYTHON_CODE_STRING",
        "stats": { "passed": number, "failed": number, "total": number },
        "score": number,
        "grade": string
        
        Return ONLY JSON. Do not include markdown formatting. Keep the tone agentic (explorer style).`;
  }
  return `You are an expert AI code reviewer.${contextInstruction} Provide a high-level architectural overview of the project (if context provided) or the file, followed by cross-file actionable suggestions. Return a valid JSON object with keys: "explanation" (string) and "suggestions" (array of strings). Do not include markdown formatting.`;
}
