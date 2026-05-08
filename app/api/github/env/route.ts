import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { repoEnvironments } from '@/app/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repoFullName = searchParams.get('repo');

    if (!repoFullName) return NextResponse.json({ error: 'Repo name required' }, { status: 400 });

    try {
        const record = await db.select()
            .from(repoEnvironments)
            .where(
                and(
                    eq(repoEnvironments.repoFullName, repoFullName),
                    eq(repoEnvironments.userEmail, session.user.email)
                )
            ).limit(1);

        return NextResponse.json({ envVars: record[0]?.envVars || {} });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch env vars' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { repoFullName, envVars } = await req.json();

    if (!repoFullName) return NextResponse.json({ error: 'Repo name required' }, { status: 400 });

    try {
        const existing = await db.select()
            .from(repoEnvironments)
            .where(
                and(
                    eq(repoEnvironments.repoFullName, repoFullName),
                    eq(repoEnvironments.userEmail, session.user.email)
                )
            ).limit(1);

        if (existing.length > 0) {
            await db.update(repoEnvironments)
                .set({ envVars, updatedAt: new Date() })
                .where(eq(repoEnvironments.id, existing[0].id));
        } else {
            await db.insert(repoEnvironments).values({
                repoFullName,
                userEmail: session.user.email,
                envVars
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save env vars' }, { status: 500 });
    }
}
