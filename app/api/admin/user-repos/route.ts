import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/app/lib/db';
import { repoEnvironments } from '@/app/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || session.provider !== 'google-admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ message: 'Missing userEmail' }, { status: 400 });
    }

    // Fetch all repositories this user has worked on from the database
    let repos: any[] = [];
    try {
        repos = await db.select().from(repoEnvironments).where(eq(repoEnvironments.userEmail, userEmail));
    } catch (e) {
        console.warn('repoEnvironments table missing for user repos fetch');
    }

    return NextResponse.json({ 
      repos: repos.map(r => ({
        id: r.id,
        fullName: r.repoFullName,
        updatedAt: r.updatedAt,
      }))
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching admin user repos:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
