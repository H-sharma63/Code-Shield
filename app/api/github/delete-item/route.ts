import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { Octokit } from 'octokit';

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { repoFullName, path, type, branchName } = await req.json();

    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName || !path) {
      return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');
    const octokit = new Octokit({ auth: session.accessToken });

    // Determine target branch
    let targetBranch = branchName;
    if (!targetBranch) {
        const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
        targetBranch = repoData.default_branch;
    }

    if (type === 'file') {
        // 1. Get the current SHA of the file
        const { data: fileData }: any = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: targetBranch,
        });

        // 2. Delete the file
        await octokit.rest.repos.deleteFile({
            owner,
            repo,
            path,
            message: `chore: delete file ${path}`,
            sha: fileData.sha,
            branch: targetBranch,
        });
    } else {
        // FOLDER DELETION LOGIC
        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${targetBranch}`,
        });
        
        const baseTreeSha = refData.object.sha;
        const { data: treeData } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: baseTreeSha,
            recursive: '1',
        });

        // Filter the tree to REMOVE anything starting with the path to delete
        const newTree = treeData.tree
            .filter((item: any) => !item.path.startsWith(path))
            .map((item: any) => ({
                path: item.path,
                mode: item.mode,
                type: item.type,
                sha: item.sha,
            }));

        // Create a new tree
        const { data: createdTree } = await octokit.rest.git.createTree({
            owner,
            repo,
            tree: newTree,
        });

        // Create a new commit
        const { data: newCommit } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message: `chore: delete folder ${path}`,
            tree: createdTree.sha,
            parents: [baseTreeSha],
        });

        // Update branch reference
        await octokit.rest.git.updateRef({
            owner,
            repo,
            ref: `heads/${targetBranch}`,
            sha: newCommit.sha,
        });
    }

    return NextResponse.json({ 
      message: 'Deleted successfully!' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('GitHub Delete Error:', error);
    return NextResponse.json({ 
      message: 'Deletion failed.', 
      error: error.message 
    }, { status: 500 });
  }
}
