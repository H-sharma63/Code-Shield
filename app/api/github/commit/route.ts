import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { repoFullName, path, content, message } = await req.json();

    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName || !path || !content || !message) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');
    const octokit = new Octokit({ auth: session.accessToken });

    // 1. Get the current commit SHA of the default branch
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;
    
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    const latestCommitSha = refData.object.sha;

    // 2. Get the tree SHA of the latest commit
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    // 3. Create a new blob for the updated content
    const { data: blobData } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content,
      encoding: 'utf-8',
    });

    // 4. Create a new tree with the updated file
    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: [
        {
          path,
          mode: '100644', // normal file
          type: 'blob',
          sha: blobData.sha,
        },
      ],
    });

    // 5. Create the new commit
    const { data: newCommitData } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: treeData.sha,
      parents: [latestCommitSha],
    });

    // 6. Update the reference to point to the new commit
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
      sha: newCommitData.sha,
    });

    return NextResponse.json({ 
      message: 'Committed successfully!', 
      sha: newCommitData.sha,
      url: newCommitData.html_url 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error committing to GitHub:', error);
    return NextResponse.json({ 
      message: 'Failed to commit changes.', 
      error: error.message 
    }, { status: 500 });
  }
}
