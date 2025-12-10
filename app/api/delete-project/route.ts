import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { projects } from '@/app/lib/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { eq } from 'drizzle-orm';
import { del } from '@vercel/blob';

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

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ message: 'Project ID is required.' }, { status: 400 });
    }

    // Fetch the project to get the blobUrl before deleting, ensuring it belongs to the user
    const projectToDelete = await db.select().from(projects).where(eq(projects.id, id)).where(eq(projects.userEmail, userEmail)).limit(1);

    if (projectToDelete.length === 0) {
      return NextResponse.json({ message: 'Project not found or you do not have permission to delete it.' }, { status: 404 });
    }

    const blobUrl = projectToDelete[0].blobUrl;

    // Delete the project from the database, ensuring it belongs to the user
    await db.delete(projects).where(eq(projects.id, id)).where(eq(projects.userEmail, userEmail));

    // Delete the associated blob from Vercel Blob storage
    if (blobUrl) {
      await del(blobUrl);
    }

    return NextResponse.json({ message: 'Project deleted successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ message: 'Internal Server Error.', error: error }, { status: 500 });
  }
}
