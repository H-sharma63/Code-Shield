import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { Octokit } from 'octokit';

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      // Don't retry on definite endpoint errors like 404/401/403
      if (i === retries - 1 || error.status === 404 || error.status === 401 || error.status === 403) {
        throw error;
      }
      console.warn(`Network drop detected. Retrying... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, 2000 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error('Unreachable');
}

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get('repo');
    const path = searchParams.get('path') || '';
    const ref = searchParams.get('ref');

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

    if (path) {
        // Fetch specific file content or directory children
        const response = await withRetry(() => octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: ref || undefined,
        }));
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
    // First, get the default branch SHA if ref is not provided
    const repoInfo = await withRetry(() => octokit.rest.repos.get({ owner, repo }));
    const targetRef = ref || repoInfo.data.default_branch;

    const download = searchParams.get('download');

    // 🛰️ ARCHIVE SCOUT: Fetch entire repo as a compressed bundle
    if (download === 'true') {
        const response = await withRetry(() => octokit.rest.repos.downloadTarballArchive({
            owner,
            repo,
            ref: targetRef,
        }));
        
        // Return the binary stream to the terminal engine
        return new NextResponse(response.data as any, {
            headers: {
                'Content-Type': 'application/x-gzip',
                'Content-Disposition': `attachment; filename="${repo}.tar.gz"`,
            }
        });
    }

    const treeResponse = await withRetry(() => octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: targetRef,
      recursive: '1',
    }));

    const items = treeResponse.data.tree.map((item: any) => ({
      name: item.path.split('/').pop(),
      path: item.path,
      type: item.type === 'tree' ? 'dir' : 'file',
      sha: item.sha,
    }));

    return NextResponse.json({ items }, { status: 200 });

  } catch (error: any) {
    if (error.status === 409 && error.message.includes('Git Repository is empty')) {
        return NextResponse.json({ 
            items: [],
            message: 'Repository is empty.',
            isEmpty: true
        }, { status: 200 });
    }
    if (error.status === 404) {
        return NextResponse.json({ 
            message: 'Path not found on GitHub.', 
            error: 'Not Found' 
        }, { status: 404 });
    }
    console.error('Error fetching GitHub contents:', error);
    return NextResponse.json({ 
      message: 'Failed to fetch contents.', 
      error: error.message 
    }, { status: 500 });
  }
}
