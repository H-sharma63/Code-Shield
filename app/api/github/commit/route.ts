import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { repoFullName, changes, message, branchName } = await req.json();

    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName || !changes || !Array.isArray(changes) || !message) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');
    const octokit = new Octokit({ auth: session.accessToken });

    // 1. Get the current commit SHA of the target branch
    let targetBranch = branchName;
    if (!targetBranch) {
        const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
        targetBranch = repoData.default_branch;
    }
    
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${targetBranch}`,
    });
    const latestCommitSha = refData.object.sha;

    // 2. Get the tree SHA of the latest commit
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for each file change
    const treeItems = [];
    for (const change of changes) {
        if (change.status === 'deleted') {
            // Setting sha to null in the Tree API with a base_tree removes the file
            treeItems.push({
                path: change.path,
                mode: '100644',
                type: 'blob',
                sha: null,
            });
            continue;
        }

        const { data: blobData } = await octokit.rest.git.createBlob({
            owner,
            repo,
            content: change.content,
            encoding: 'utf-8',
        });

        treeItems.push({
            path: change.path,
            mode: '100644', // normal file
            type: 'blob',
            sha: blobData.sha,
        });
    }

    if (treeItems.length === 0) {
        return NextResponse.json({ message: 'No valid changes to commit.' }, { status: 400 });
    }

    // 4. Create a new tree with all changed files
    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeItems as any[],
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
      ref: `heads/${targetBranch}`,
      sha: newCommitData.sha,
    });

    return NextResponse.json({ 
      message: `${treeItems.length} files committed successfully!`, 
      sha: newCommitData.sha,
      url: `https://github.com/${repoFullName}/commit/${newCommitData.sha}`
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error committing to GitHub:', error);
    return NextResponse.json({ 
      message: 'Failed to commit changes.', 
      error: error.message 
    }, { status: 500 });
  }
}
