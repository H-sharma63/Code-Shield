import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from 'octokit';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.accessToken || session.provider !== 'github') {
      return NextResponse.json({ 
        message: 'GitHub connection required.',
        error: 'NOT_CONNECTED' 
      }, { status: 401 });
    }

    const octokit = new Octokit({
      auth: session.accessToken
    });

    // Fetch all repositories for the authenticated user
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
      language: repo.language,
    }));

    return NextResponse.json({ repos }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching GitHub repos:', error);
    return NextResponse.json({ 
      message: 'Failed to fetch repositories.', 
      error: error.message 
    }, { status: 500 });
  }
}
