import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/app/lib/db';
// import { users } from '@/app/lib/schema';
// import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { name, email, provider } = await req.json(); 

    if (!name || !provider) { 
      return NextResponse.json({ message: 'Name and provider are required.' }, { status: 400 });
    }

    // User logging to DB is disabled as per user's request.
    // const existingUsers = await db.select().from(users).where(eq(users.email, email));
    // const isDuplicate = existingUsers.some(user => user.provider === provider);

    // if (isDuplicate) {
    //   return NextResponse.json({ message: 'User already logged.' }, { status: 200 });
    // }

    // await db.insert(users).values({ name, email, provider });

    return NextResponse.json({ message: 'User logging to DB is disabled. Data not stored.' }, { status: 200 });

  } catch (error) {
    console.error('Error in log-user route (functionality disabled):', error);
    return NextResponse.json({ message: 'Internal Server Error (logging disabled).' }, { status: 500 });
  }
}
