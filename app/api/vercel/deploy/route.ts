import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/app/lib/db';
import { repoEnvironments } from '@/app/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  const token = (await cookies()).get('vercel_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated with Vercel' }, { status: 401 });
  }

  const { projectName, repoFullName, userEmail } = await request.json();

  if (!projectName || !repoFullName) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    // 1. Create or Get Vercel Project
    const projectResponse = await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        framework: 'nextjs',
        gitRepository: {
          type: 'github',
          repo: repoFullName,
        },
      }),
    });

    let projectData = await projectResponse.json();

    // If project already exists, it might return 409 or similar. 
    // In a real scenario, we'd handle "already exists" by fetching the existing project.
    if (projectResponse.status === 409 || (projectData.error && projectData.error.code === 'conflict')) {
       const fetchRes = await fetch(`https://api.vercel.com/v9/projects/${projectName}`, {
         headers: { Authorization: `Bearer ${token}` }
       });
       projectData = await fetchRes.json();
    }

    if (!projectData.id) {
        return NextResponse.json({ error: 'Failed to create/fetch Vercel project', detail: projectData }, { status: 500 });
    }

    const projectId = projectData.id;

    // 2. Fetch Env Vars from Database
    const envRecords = await db.select()
        .from(repoEnvironments)
        .where(
            and(
                eq(repoEnvironments.repoFullName, repoFullName),
                eq(repoEnvironments.userEmail, userEmail)
            )
        );

    const envVars = envRecords.length > 0 ? (envRecords[0].envVars as Record<string, string>) : {};

    // 3. Inject Env Vars into Vercel
    // We iterate and add each env var. In production, you might want to check existing ones first.
    for (const [key, value] of Object.entries(envVars)) {
        await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                key,
                value,
                type: 'plain',
                target: ['development', 'preview', 'production'],
            }),
        });
    }

    // 4. Trigger Deployment
    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        gitSource: {
          type: 'github',
          ref: 'main',
          repoId: projectData.link?.repoId || repoFullName // Use repoId if available
        },
        project: projectId
      }),
    });

    const deployData = await deployResponse.json();

    return NextResponse.json({ 
        message: 'Deployment triggered successfully', 
        deployment: deployData 
    });

  } catch (error) {
    console.error('Vercel Deployment Error:', error);
    return NextResponse.json({ error: 'Deployment process failed' }, { status: 500 });
  }
}
