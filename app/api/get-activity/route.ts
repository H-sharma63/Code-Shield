import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { projects } from '@/app/lib/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    const allProjects = await db.select().from(projects).where(eq(projects.userEmail, userEmail)).orderBy(desc(projects.updatedAt));

    const activities = allProjects.map(project => {
      // Determine if it was a creation or an edit.
      // We'll consider it an 'edited' event if updatedAt is significantly after createdAt.
      // Using a small threshold (e.g., 1 second) to account for database timestamp precision.
      const isEdited = (project.updatedAt.getTime() - project.createdAt.getTime()) > 1000;

      return {
        ...project,
        eventType: isEdited ? 'edited' : 'created',
        eventTimestamp: isEdited ? project.updatedAt : project.createdAt, // Sort by the relevant timestamp
      };
    }).sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime()); // Sort by the event timestamp

    // Limit to 5 most recent activities
    const recentActivities = activities.slice(0, 5);

    return NextResponse.json({ activities: recentActivities }, { status: 200 });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ message: 'Internal Server Error.' }, { status: 500 });
  }
}
