import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { projects } from '@/app/lib/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user?.email;

    if (!userEmail) {
      return NextResponse.json({ message: 'User email not found in session.' }, { status: 401 });
    }

    const { id, newProjectName } = await req.json();

    if (!id || !newProjectName) {
      return NextResponse.json({ message: 'Project ID and new project name are required.' }, { status: 400 });
    }

    await db.update(projects).set({ projectName: newProjectName }).where(eq(projects.id, id)).where(eq(projects.userEmail, userEmail));

    return NextResponse.json({ message: 'Project renamed successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Error renaming project:', error);
    return NextResponse.json({ message: 'Internal Server Error.', error: error }, { status: 500 });
  }
}
