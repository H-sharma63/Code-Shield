import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/app/lib/db';
import { repoEnvironments, projects, testRuns } from '@/app/lib/schema';
import { count } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || session.provider !== 'google-admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    let totalProjects = 0;
    let testRunsVal = 0;
    let activeSyncsVal = 0;

    try {
        const [projectsCount] = await db.select({ value: count() }).from(repoEnvironments);
        activeSyncsVal = Number(projectsCount?.value || 0);
    } catch (e) {
        console.warn('repoEnvironments table missing');
    }

    try {
        const [fileProjectsCount] = await db.select({ value: count() }).from(projects);
        totalProjects = activeSyncsVal + Number(fileProjectsCount?.value || 0);
    } catch (e) {
        console.warn('projects table missing');
        totalProjects = activeSyncsVal;
    }

    try {
        const [testRunsCount] = await db.select({ value: count() }).from(testRuns);
        testRunsVal = Number(testRunsCount?.value || 0);
    } catch (e) {
        console.warn('testRuns table missing');
    }

    let engineStats = null;
    try {
        const gcpUrl = process.env.NEXT_PUBLIC_GCP_URL || 'http://34.10.151.8:8080';
        const statsUrl = gcpUrl.replace('ws://', 'http://').replace('wss://', 'https://') + '/stats';
        
        const res = await fetch(statsUrl, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            engineStats = await res.json();
        } else {
            console.warn(`GCP Backend returned status: ${res.status} for ${statsUrl}`);
        }
    } catch (e: any) {
        console.error(`GCP Backend stats fetch failed (${e.message})`);
    }

    let allProjectsList: any[] = [];
    try {
        const projectsFromDb = await db.select().from(repoEnvironments);
        allProjectsList = projectsFromDb.map(p => ({
            id: p.id,
            owner: p.repoFullName.split('/')[0],
            repo: p.repoFullName.split('/')[1],
            fullName: p.repoFullName,
            updatedAt: p.updatedAt,
            userEmail: p.userEmail
        }));
    } catch (e) {
        console.warn('allProjects fetch failed');
    }

    return NextResponse.json({ 
        totalProjects,
        testRuns: testRunsVal,
        activeSyncs: activeSyncsVal,
        engine: engineStats?.engine || null,
        activeSessions: engineStats?.sessions || [],
        allProjects: allProjectsList
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
