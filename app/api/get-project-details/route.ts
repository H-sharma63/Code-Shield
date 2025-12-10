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

    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json({ message: 'File name is required.' }, { status: 400 });
    }

    const project = await db.select().from(projects).where(eq(projects.fileName, fileName)).where(eq(projects.userEmail, userEmail)).limit(1);

    if (project.length === 0) {
      return NextResponse.json({ message: 'Project not found or you do not have permission to view it.' }, { status: 404 });
    }

    return NextResponse.json({ project: project[0] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching project details:', error);
    return NextResponse.json({ message: 'Internal Server Error.' }, { status: 500 });
  }
}
