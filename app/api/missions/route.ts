import { NextRequest, NextResponse } from 'next/server';
import { callVertexAI, callGeminiFallback } from '@/app/lib/ai/vertex-service';

const VERTEX_MODELS: Record<string, { type: 'google' | 'anthropic' | 'mistral'; apiModel: string }> = {
  'gemini-1.5-pro': { type: 'google', apiModel: 'gemini-1.5-pro-002' },
  'gemini-1.5-flash': { type: 'google', apiModel: 'gemini-1.5-flash-002' },
};

export async function POST(req: NextRequest) {
  try {
    const { phase, code, context, tier = 'security', modelId = 'gemini-1.5-pro', language = 'python' } = await req.json();

    const vertexConfig = VERTEX_MODELS[modelId] || VERTEX_MODELS['gemini-1.5-pro'];

    let systemPrompt = "";
    let userPrompt = "";

    if (phase === 'scout') {
        systemPrompt = `You are a Resident Mission Scout. Your goal is to analyze the project context and propose a 5-8 point "Test Strategy" for the '${tier}' tier.
        
        CRITICAL RULES:
        1. "Ingest" the README, schemas, and file structure to understand intent.
        2. Propose specific, adversarial test missions (e.g. "Simulate Auth0 bypass", "Fuzz the JSON parser").
        3. Do NOT code yet. Just provide a strategic list.
        4. LANGUAGE AWARENESS: The target code is in ${language}. Ensure the strategy is feasible for this environment.

        Return ONLY a JSON object:
        {
          "strategy": [
            { "id": "uuid", "label": "Short name", "intent": "What we are testing", "impact": "High|Med|Low" }
          ],
          "ingestionSummary": "Short recap of what you learned about the project"
        }`;
        userPrompt = `--- PROJECT SCOPE ---\n${context}\n\n MISSION FOCUS: ${tier.toUpperCase()} [Language: ${language}]`;
    } else if (phase === 'script') {
        const mockInstruction = language === 'python' 
            ? "You MUST use 'unittest.mock' for ALL external imports."
            : "You MUST use 'jest.mock' or simple object mocks for ALL external imports. Do NOT use Python's unittest.mock in JavaScript.";

        systemPrompt = `You are a Resident Senior QA Agent. Use the project context to author a VERIFIABLE test suite in ${language}.
        
        CRITICAL RULES:
        1. MOCKING MASTER: ${mockInstruction} Focus ONLY on the code logic.
        2. SUBJECT FILE: Assume the code is in "subject_code". Your testSuite MUST import this module.
        3. REAL PROOFS: Write code that validates the logic.
        4. NO CROSS-POLLINATION: Do NOT use Python patterns (like 'patch' or decorators) if the language is JavaScript.

        Return ONLY a JSON object:
        {
          "testSuite": "SOURCE_CODE_STRING",
          "intentExplainer": "How this script verifies the proposed strategy"
        }`;
        userPrompt = `--- TARGET CODE (${language}) ---\n${code}\n\n--- MISSION CONTEXT ---\n${context}`;
    }

    let responseContent: string;
    try {
        responseContent = await callVertexAI(vertexConfig.type, vertexConfig.apiModel, userPrompt, systemPrompt, 'json');
    } catch (error: any) {
        responseContent = await callGeminiFallback(userPrompt, systemPrompt, 'json');
    }

    const jsonStr = responseContent.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    // Injection for scripts
    if (phase === 'script' && parsed.testSuite) {
        const codeB64 = Buffer.from(code).toString('base64');
        const injection = `import base64\nwith open("subject_code.py", "wb") as f: f.write(base64.b64decode("${codeB64}"))\n\n`;
        parsed.testSuite = injection + parsed.testSuite;
    }

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("[MISSION_CONTROLLER_ERROR]", error.message);
    return NextResponse.json({ message: 'Mission phase failed', error: error.message }, { status: 500 });
  }
}
