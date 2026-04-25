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
    const ref = searchParams.get('ref');

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
      ref: ref || undefined,
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
    if (error.status === 404) {
        return NextResponse.json({ 
            message: 'File not found on GitHub. If this is a new file, you need to commit it first.', 
            error: 'Not Found' 
        }, { status: 404 });
    }
    console.error('Error pulling from GitHub:', error);
    return NextResponse.json({ 
      message: 'Failed to pull changes.', 
      error: error.message 
    }, { status: 500 });
  }
}
