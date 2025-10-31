import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { projects } from '@/app/lib/schema';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Keep a basic session check to ensure the request is from an authenticated user,
    // even if no user-specific data is stored with the project.
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileData } = await req.json();

    if (!fileName || !fileData) {
      return NextResponse.json({ message: 'File name and file data are required.' }, { status: 400 });
    }

    await db.insert(projects).values({
      fileName,
      fileData,
    });

    return NextResponse.json({ message: 'Project saved successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Error saving project:', error);
    return NextResponse.json({ message: 'Internal Server Error.' }, { status: 500 });
  }
}