import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get('repo');
    const path = searchParams.get('path');

    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName || !path) {
      return NextResponse.json({ message: 'Repository and Path are required' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');
    const octokit = new Octokit({ auth: session.accessToken });

    // Fetch the latest content of the file from GitHub
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    const data: any = response.data;

    if (data.content) {
        // Decode from Base64
        const decodedContent = atob(data.content.replace(/\n/g, ''));
        return NextResponse.json({ 
            content: decodedContent,
            sha: data.sha,
            message: 'Pulled successfully!'
        }, { status: 200 });
    }

    throw new Error('No content found for this file.');

  } catch (error: any) {
    console.error('Error pulling from GitHub:', error);
    return NextResponse.json({ 
      message: 'Failed to pull changes.', 
      error: error.message 
    }, { status: 500 });
  }
}
