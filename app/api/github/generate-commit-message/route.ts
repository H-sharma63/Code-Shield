import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { callVertexAI, callGeminiFallback } from '@/app/lib/ai/vertex-service';
import { callOpenRouter } from '@/app/lib/ai/openrouter-service';

const SYSTEM_PROMPT = `You are an expert developer. Generate a concise, professional Git commit message based on the provided file changes.
Follow the Conventional Commits specification (e.g., feat: ..., fix: ..., chore: ..., docs: ...).
Focus on "what" and "why" of the changes.
Keep the first line under 50 characters.
Return ONLY the commit message text, no markdown, no quotes, no explanations.`;

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { changes, modelId = 'gemini-3.1-pro-preview' } = await req.json();

    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({ message: 'No changes provided' }, { status: 400 });
    }

    // Prepare a detailed diff-like summary for the AI
    const changesSummary = changes.map((c: any) => {
        if (c.status === 'added') {
            return `FILE: ${c.path} (ADDED)\nNEW CONTENT:\n${c.content?.substring(0, 1000)}`;
        }
        return `FILE: ${c.path} (MODIFIED)\nBEFORE:\n${c.originalContent?.substring(0, 500)}\nAFTER:\n${c.content?.substring(0, 500)}`;
    }).join('\n\n---\n\n');

    const fullPrompt = `Analyze the following code changes and generate a professional commit message:\n\n${changesSummary}`;

    let responseContent: string;
    
    // Using the established AI calling pattern
    if (modelId.includes('gemini') || modelId.includes('mistral')) {
        try {
            responseContent = await callVertexAI('google', 'gemini-3.1-pro-preview', fullPrompt, SYSTEM_PROMPT, 'text');
        } catch (e) {
            responseContent = await callGeminiFallback(fullPrompt, SYSTEM_PROMPT, 'text');
        }
    } else {
        responseContent = await callOpenRouter(modelId, fullPrompt, SYSTEM_PROMPT);
    }

    const commitMessage = responseContent.replace(/["']/g, '').trim();

    return NextResponse.json({ commitMessage }, { status: 200 });

  } catch (error: any) {
    console.error('Commit message generation error:', error);
    return NextResponse.json({ 
      message: 'Failed to generate commit message.', 
      error: error.message 
    }, { status: 500 });
  }
}
