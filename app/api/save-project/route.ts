import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { projects } from '@/app/lib/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { put } from '@vercel/blob';
import { eq, and } from 'drizzle-orm';

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

    const { id, projectName, fileName, fileData } = await req.json();

    if (!fileName) {
      return NextResponse.json({ message: 'File name is required.' }, { status: 400 });
    }

    const blob = await put(fileName, fileData, {
      access: 'public',
      allowOverwrite: true,
    });

    if (id) {
      // Update existing project by id, ensuring it belongs to the user
      await db.update(projects).set({ projectName, fileName, blobUrl: blob.url, updatedAt: new Date() }).where(eq(projects.id, id)).where(eq(projects.userEmail, userEmail));
    } else {
      // Check if a project with the same projectName and fileName already exists for this user
      const existingProject = await db.select().from(projects).where(
        and(
          eq(projects.userEmail, userEmail),
          eq(projects.projectName, projectName),
          eq(projects.fileName, fileName)
        )
      ).limit(1);

      if (existingProject.length > 0) {
        // Update the existing project
        await db.update(projects).set({ blobUrl: blob.url, updatedAt: new Date() }).where(eq(projects.id, existingProject[0].id));
      } else {
        // Insert new project for this user
        await db.insert(projects).values({
          projectName,
          fileName,
          blobUrl: blob.url,
          userEmail,
        });
      }
    }

    return NextResponse.json({ message: 'Project saved successfully.', url: blob.url }, { status: 200 });

  } catch (error: any) {
    console.error('Error saving project:', error);
    return NextResponse.json({ message: 'Internal Server Error.', error: error.message || 'Unknown error' }, { status: 500 });
  }
}