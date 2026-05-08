import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { Octokit } from 'octokit';
import { callVertexAI, callGeminiFallback } from '@/app/lib/ai/vertex-service';
import { callOpenRouter } from '@/app/lib/ai/openrouter-service';

const VERTEX_MODELS: Record<string, { type: 'google' | 'anthropic' | 'mistral'; apiModel: string }> = {
  'gemini-3.1-pro-preview': { type: 'google', apiModel: 'gemini-3.1-pro-preview' },
  'mistral-codestral2': { type: 'mistral', apiModel: 'codestral-2' },
  'gemini-test': { type: 'google', apiModel: 'gemini-3.1-pro-preview' },
};

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { repoFullName, prNumber, modelId = 'gemini-test' } = await req.json();

    if (!session || !session.accessToken) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName || !prNumber) {
        return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');
    const octokit = new Octokit({ auth: session.accessToken });

    // 1. Fetch PR Diff
    const prResponse = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: parseInt(prNumber),
        headers: {
            accept: 'application/vnd.github.v3.diff',
        },
    });
    const diff = prResponse.data as unknown as string;

    // 2. Fetch PR Metadata
    const metadataResponse = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: parseInt(prNumber),
    });
    const prMetadata = metadataResponse.data;

    // 3. Prepare AI Prompt
    const systemPrompt = `You are an expert Senior Software Engineer and Code Reviewer. 
    Analyze the provided Git Diff from a Pull Request and provide a comprehensive review.
    Focus on:
    - Code quality and maintainability
    - Potential bugs or edge cases
    - Performance implications
    - Security vulnerabilities
    - Adherence to best practices
    
    Return your review as a valid JSON object with the following keys:
    - "overview": A high-level summary of the PR.
    - "keyChanges": An array of strings describing the main changes.
    - "issues": An array of objects with "severity" (high/medium/low), "file", "line", and "description".
    - "suggestions": An array of actionable improvement suggestions.
    - "conclusion": A final verdict (Approve, Request Changes, or Comment).

    Return ONLY JSON. Do not include markdown formatting.`;

    const fullPrompt = `PR Title: ${prMetadata.title}\nPR Description: ${prMetadata.body || 'No description provided.'}\n\nGIT DIFF:\n${diff}`;

    // 4. Call AI
    let responseContent: string;
    let finalModelName = modelId;
    const vertexConfig = VERTEX_MODELS[modelId];

    if (vertexConfig) {
      try {
        responseContent = await callVertexAI(vertexConfig.type, vertexConfig.apiModel, fullPrompt, systemPrompt, 'json');
        finalModelName = vertexConfig.apiModel;
      } catch (error: any) {
        responseContent = await callGeminiFallback(fullPrompt, systemPrompt, 'json');
        finalModelName = 'gemini-2.0-flash (Fallback)';
      }
    } else {
      responseContent = await callOpenRouter(modelId, fullPrompt, systemPrompt);
    }

    // 5. Parse AI Response
    let strResponse = typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent);
    let content = strResponse.replace(/```json|```/g, '').trim();
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');

    if (start === -1 || end === -1) throw new Error("Invalid AI response format");
    let jsonStr = content.substring(start, end + 1);

    try {
      const parsed = JSON.parse(jsonStr);
      return NextResponse.json({ ...parsed, model: finalModelName });
    } catch (e: any) {
      console.error("AI PR Review parsing failed:", e.message);
      return NextResponse.json({ message: 'AI review parsing failed.', raw: responseContent }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error during AI PR review:', error);
    return NextResponse.json({ 
      message: 'PR review failed.', 
      error: error.message 
    }, { status: 500 });
  }
}
