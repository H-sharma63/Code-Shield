import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const token = (await cookies()).get('vercel_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated with Vercel' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId'); // Optional: filter by project

  let url = 'https://api.vercel.com/v6/deployments';
  if (projectId) {
    url += `?projectId=${projectId}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Vercel Fetch Deployments Error:', error);
    return NextResponse.json({ error: 'Failed to fetch deployments' }, { status: 500 });
  }
}
