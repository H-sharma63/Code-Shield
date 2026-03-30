import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get('repo');
    const path = searchParams.get('path') || '';

    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName) {
      return NextResponse.json({ message: 'Repository name is required' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');

    const octokit = new Octokit({
      auth: session.accessToken
    });

    if (path) {
        // Fetch specific file content or directory children
        const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
        });
        const data: any = response.data;

        // If it's a directory, return its children
        if (Array.isArray(data)) {
            const items = data.map((item: any) => ({
                name: item.name,
                path: item.path,
                type: item.type === 'dir' ? 'dir' : 'file',
                sha: item.sha,
            }));
            return NextResponse.json({ items }, { status: 200 });
        }

        // If it's a single file
        return NextResponse.json({ 
            item: {
                name: data.name,
                path: data.path,
                type: data.type,
                content: data.content, 
                encoding: data.encoding,
                downloadUrl: data.download_url,
            }
        }, { status: 200 });
    }

    // Fetch the ENTIRE recursive tree if no path is provided (initial load)
    // First, get the default branch SHA
    const repoInfo = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoInfo.data.default_branch;

    const treeResponse = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: '1',
    });

    const items = treeResponse.data.tree.map((item: any) => ({
      name: item.path.split('/').pop(),
      path: item.path,
      type: item.type === 'tree' ? 'dir' : 'file',
      sha: item.sha,
    }));

    return NextResponse.json({ items }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching GitHub contents:', error);
    return NextResponse.json({ 
      message: 'Failed to fetch contents.', 
      error: error.message 
    }, { status: 500 });
  }
}
