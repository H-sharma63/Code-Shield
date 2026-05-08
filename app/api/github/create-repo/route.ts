import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { Octokit } from 'octokit';

export async function POST(req: NextRequest) {
  const session: any = await getServerSession(authOptions);

  try {
    if (!session || !session.accessToken) {
      return NextResponse.json({ 
        message: 'GitHub access token missing. Please sign in with GitHub.',
        error: 'AUTH_REQUIRED' 
      }, { status: 401 });
    }

    if (session.provider !== 'github') {
        return NextResponse.json({ 
          message: 'This session is not authenticated with GitHub.',
          error: 'PROVIDER_MISMATCH' 
        }, { status: 401 });
    }

    const { name, description, isPrivate, template } = await req.json();

    if (!name) {
      return NextResponse.json({ message: 'Repository name is required.' }, { status: 400 });
    }

    const octokit = new Octokit({
      auth: session.accessToken
    });

    // Create a new repository for the authenticated user
    const response = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      description: description || `Created with CodeShield (${template || 'blank'} template)`,
      private: isPrivate ?? true,
      auto_init: template === 'blank' || !template, // Only auto-init for blank repos
    });

    return NextResponse.json({ 
      message: 'Repository created successfully.', 
      repo: {
        id: response.data.id,
        name: response.data.name,
        fullName: response.data.full_name,
        url: response.data.html_url,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating GitHub repo:', error);
    
    let errorMessage = 'Failed to create repository.';
    if (error.status === 422) {
      errorMessage = 'Repository name already exists or is invalid.';
    } else if (error.status === 401 || error.status === 403) {
      errorMessage = 'Insufficient permissions or expired token. Please sign in again.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ 
      message: errorMessage, 
      error: error.message,
      debug: {
        status: error.status,
        response: error.response?.data,
        hasToken: !!session?.accessToken,
        provider: session?.provider
      }
    }, { status: error.status || 500 });
  }
}
