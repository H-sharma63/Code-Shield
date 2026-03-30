import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { callVertexAI, callGeminiFallback } from '@/app/lib/ai/vertex-service';

const VERTEX_MODELS: Record<string, { type: 'google' | 'anthropic' | 'mistral'; apiModel: string }> = {
  'gemini-1.5-pro': { type: 'google', apiModel: 'gemini-1.5-pro-002' },
  'gemini-1.5-flash': { type: 'google', apiModel: 'gemini-1.5-flash-002' },
};

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { code, context, action, modelId = 'gemini-1.5-pro' } = await req.json();

    if (!code || !action) {
      return NextResponse.json({ message: 'Code and action are required.' }, { status: 400 });
    }

    const vertexConfig = VERTEX_MODELS[modelId] || VERTEX_MODELS['gemini-1.5-pro'];

    let systemPrompt = "";
    let userPrompt = "";

    if (action === 'fix') {
        systemPrompt = "You are an expert AI software engineer. Your goal is to REFACTOR the provided code to fix bugs, improve performance, and enhance readability.";
        userPrompt = `CONTEXT:\n${context || 'General refactor requested.'}\n\nCODE TO REFACTOR:\n${code}\n\nReturn ONLY the refactored code without markdown blocks.`;
    } else if (action === 'test') {
        systemPrompt = "You are an expert AI test automation engineer. Your goal is to generate COMPREHENSIVE UNIT TESTS for the provided code.";
        userPrompt = `TARGET CODE:\n${code}\n\nCONTEXT:\n${context || ''}\n\nReturn ONLY the test code without markdown blocks.`;
    }

    let responseContent: string;
    try {
        responseContent = await callVertexAI(vertexConfig.type, vertexConfig.apiModel, userPrompt, systemPrompt, 'text');
    } catch (error: any) {
        responseContent = await callGeminiFallback(userPrompt, systemPrompt, 'text');
    }

    const cleanedCode = responseContent.replace(/```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

    return NextResponse.json({ 
        code: cleanedCode,
        action: action
    });

  } catch (error: any) {
    console.error('Refactor Error:', error);
    return NextResponse.json({ 
      message: 'Failed to process refactor request.', 
      error: error.message 
    }, { status: 500 });
  }
}
