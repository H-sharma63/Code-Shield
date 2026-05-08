import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { Octokit } from 'octokit';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get('repo');

    if (!process.env.GITHUB_TOKEN && (!session || !session.accessToken)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName) {
      return NextResponse.json({ message: 'Repository name is required' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN || session?.accessToken
    });

    const response = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    const branches = response.data.map(branch => ({
      name: branch.name,
      commit: branch.commit.sha,
      protected: branch.protected,
    }));

    return NextResponse.json({ branches }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching GitHub branches:', error);
    return NextResponse.json({ 
      message: 'Failed to fetch branches.', 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
    try {
        const session: any = await getServerSession(authOptions);
        const { repoFullName, branchName, fromBranch } = await req.json();

        if (!process.env.GITHUB_TOKEN && (!session || !session.accessToken)) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        if (!repoFullName || !branchName) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const [owner, repo] = repoFullName.split('/');
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN || session?.accessToken
        });

        // 1. Get the SHA of the base branch
        const baseBranchResponse = await octokit.rest.repos.getBranch({
            owner,
            repo,
            branch: fromBranch || 'main',
        });
        const sha = baseBranchResponse.data.commit.sha;

        // 2. Create the new branch (ref)
        await octokit.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha,
        });

        return NextResponse.json({ message: `Branch ${branchName} created successfully.` }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating GitHub branch:', error);
        return NextResponse.json({ 
            message: 'Failed to create branch.', 
            error: error.message 
        }, { status: 500 });
    }
}
