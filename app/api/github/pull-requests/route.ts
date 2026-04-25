import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get('repo');
    const prNumber = searchParams.get('number');

    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName) {
      return NextResponse.json({ message: 'Repository name is required' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');
    const octokit = new Octokit({ auth: session.accessToken });

    if (prNumber) {
        // Fetch specific PR details and its diff
        const prResponse = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: parseInt(prNumber),
            headers: {
                accept: 'application/vnd.github.v3.diff',
            },
        });

        // The diff is returned as a string when accept header is set to diff
        const diff = prResponse.data as unknown as string;

        // Also fetch metadata
        const metadataResponse = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: parseInt(prNumber),
        });

        return NextResponse.json({ 
            pr: metadataResponse.data,
            diff: diff
        }, { status: 200 });

    } else {
        // List all open PRs
        const response = await octokit.rest.pulls.list({
            owner,
            repo,
            state: 'open',
            per_page: 50,
        });

        return NextResponse.json({ pullRequests: response.data }, { status: 200 });
    }

  } catch (error: any) {
    if (error.status === 404) {
        return NextResponse.json({ 
            message: 'Repository or pull request not found on GitHub.', 
            error: 'Not Found' 
        }, { status: 404 });
    }
    console.error('Error fetching PRs:', error);
    return NextResponse.json({ 
      message: 'Failed to fetch pull requests.', 
      error: error.message 
    }, { status: 500 });
  }
}
