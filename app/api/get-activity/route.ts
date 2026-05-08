import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { projects } from '@/app/lib/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { Octokit } from 'octokit';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    // 1. Fetch Local Activities from DB
    const allProjects = await db.select().from(projects).where(eq(projects.userEmail, userEmail)).orderBy(desc(projects.updatedAt));

    const localActivities = allProjects.map(project => {
      const isEdited = (project.updatedAt.getTime() - project.createdAt.getTime()) > 1000;
      return {
        id: project.id,
        projectName: project.projectName,
        fileName: project.fileName,
        eventType: isEdited ? 'edited' : 'created',
        eventTimestamp: isEdited ? project.updatedAt : project.createdAt,
      };
    });

    let activities = [...localActivities];

    // 2. Fetch GitHub Activities (if connected)
    if (session.accessToken && session.provider === 'github') {
      try {
        const octokit = new Octokit({ auth: session.accessToken });
        const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
          sort: 'pushed',
          per_page: 10,
        });

        const githubActivities = repos.map(repo => ({
          id: repo.id,
          projectName: repo.name,
          fileName: repo.full_name, // Store full name in fileName for context
          eventType: 'github_push',
          eventTimestamp: new Date(repo.pushed_at || repo.updated_at || ''),
          repoUrl: repo.html_url
        }));

        activities = [...activities, ...githubActivities];
      } catch (githubError) {
        console.error('Failed to fetch GitHub activity:', githubError);
      }
    }

    // 3. Sort by most recent and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime())
      .slice(0, 8);

    return NextResponse.json({ activities: sortedActivities }, { status: 200 });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ message: 'Internal Server Error.' }, { status: 500 });
  }
}
