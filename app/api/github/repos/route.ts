import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { Octokit } from 'octokit';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!process.env.GITHUB_TOKEN && (!session || !session.accessToken)) {
      return NextResponse.json({ 
        message: 'GitHub access token missing. Please sign in or provide a GITHUB_TOKEN.',
        error: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    if (session.provider !== 'github') {
        return NextResponse.json({ 
          message: 'This session is not authenticated with GitHub. Please reconnect via GitHub.',
          error: 'PROVIDER_MISMATCH' 
        }, { status: 401 });
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN || session?.accessToken
    });

    // Use GraphQL to fetch everything in one request to avoid N+1 slowness
    const query = `
      query($count: Int!) {
        viewer {
          repositories(first: $count, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes {
              databaseId
              name
              nameWithOwner
              description
              url
              isPrivate
              isFork
              updatedAt
              primaryLanguage {
                name
              }
              parent {
                nameWithOwner
              }
            }
          }
        }
      }
    `;

    const response: any = await octokit.graphql(query, {
      count: 50 // Fetch enough to cover the dashboard needs
    });

    const repos = response.viewer.repositories.nodes.map((repo: any) => ({
      id: repo.databaseId,
      name: repo.name,
      fullName: repo.nameWithOwner,
      description: repo.description,
      url: repo.url,
      isPrivate: repo.isPrivate,
      isFork: repo.isFork,
      forkSource: repo.parent?.nameWithOwner || null,
      updatedAt: repo.updatedAt,
      language: repo.primaryLanguage?.name || null,
    }));

    return NextResponse.json({ repos }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching GitHub repos (GraphQL):', error);
    // Fallback or error reporting
    return NextResponse.json({ 
      message: 'Failed to fetch repositories.', 
      error: error.message 
    }, { status: 500 });
  }
}
