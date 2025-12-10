import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { projects } from '@/app/lib/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    const userProjects = await db.select().from(projects).where(eq(projects.userEmail, userEmail));

    return NextResponse.json({ projects: userProjects }, { status: 200 });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ message: 'Internal Server Error.' }, { status: 500 });
  }
}
