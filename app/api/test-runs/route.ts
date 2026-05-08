import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { testRuns, projects } from '@/app/lib/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { repoFullName, totalTests, passed, failed, results } = body;

    // Find the project ID by repoFullName
    const [project] = await db.select().from(projects).where(eq(projects.projectName, repoFullName)).limit(1);
    
    let projectId = null;
    if (project) {
        projectId = project.id;
    }

    const [newRun] = await db.insert(testRuns).values({
      projectId,
      userId: session.user.email || 'anonymous',
      totalTests,
      passed,
      failed,
      results: typeof results === 'string' ? results : JSON.stringify(results),
      ranAt: new Date(),
    }).returning();

    return NextResponse.json({ success: true, run: newRun });
  } catch (error: any) {
    console.error('Error saving test run:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
