import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const { repoFullName, path, type } = await req.json();

    if (!session || !session.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!repoFullName || !path || !type) {
      return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    const [owner, repo] = repoFullName.split('/');
    const octokit = new Octokit({ auth: session.accessToken });

    // 1. Sanitize the path
    let sanitizedPath = path.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
    
    // 2. Determine final path and initial content
    // Note: GitHub doesn't have "folders", only files with paths.
    // To create a "folder", we must create a file inside it.
    const finalPath = type === 'folder' ? `${sanitizedPath}/.gitkeep` : sanitizedPath;
    const content = type === 'folder' 
        ? '' 
        : `// ${sanitizedPath.split('/').pop()} created via CodeShield\n`;

    // 3. Create/Update on GitHub
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: finalPath,
      message: `feat: create ${type} ${sanitizedPath}`,
      content: Buffer.from(content).toString('base64'),
    });

    return NextResponse.json({ 
      message: 'Created successfully!' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('GitHub Create Error:', error);
    
    let errorDetail = error.message;
    if (error.status === 422) errorDetail = "Item already exists at this path.";
    
    return NextResponse.json({ 
      message: 'Creation failed.', 
      error: errorDetail 
    }, { status: error.status || 500 });
  }
}
