import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';

/**
 * Global Code Search API
 * Scans the entire repository for the provided query.
 */
export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get('repo');
    const query = searchParams.get('q');

    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName || !query) {
      return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');
    const octokit = new Octokit({ auth: session.accessToken });

    // --- STRATEGY: GitHub API Code Search ---
    // Note: This relies on GitHub's index, which may have a slight lag.
    const searchResponse = await octokit.rest.search.code({
        q: `${query} repo:${repoFullName}`,
    });

    const results = await Promise.all(searchResponse.data.items.map(async (item: any) => {
        // Fetch specific file to get line numbers/context (Search API only gives file info)
        try {
            const contentRes = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: item.path,
            });
            const data: any = contentRes.data;
            if (data.content) {
                const decoded = atob(data.content.replace(/\n/g, ''));
                const lines = decoded.split('\n');
                const matches: { line: number, text: string }[] = [];
                
                lines.forEach((lineText, idx) => {
                    if (lineText.toLowerCase().includes(query.toLowerCase())) {
                        matches.push({ line: idx + 1, text: lineText.trim() });
                    }
                });

                return {
                    path: item.path,
                    name: item.name,
                    matches: matches.slice(0, 10) // Limit matches per file
                };
            }
        } catch (e) {
            console.error(`Error processing search result for ${item.path}:`, e);
        }
        return null;
    }));

    return NextResponse.json({ 
        results: results.filter(r => r !== null && r.matches.length > 0) 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Code search error:', error);
    return NextResponse.json({ 
      message: 'Failed to search code.', 
      error: error.message 
    }, { status: 500 });
  }
}
