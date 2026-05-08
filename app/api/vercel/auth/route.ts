import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.VERCEL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'VERCEL_CLIENT_ID is not configured' }, { status: 500 });
  }

  const redirectUri = process.env.VERCEL_REDIRECT_URI || 'http://localhost:3000/api/vercel/callback';

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    state: 'codeshield-auth',
    redirect_uri: redirectUri
  });

  const vercelAuthUrl = `https://vercel.com/oauth/authorize?${params.toString()}`;

  return NextResponse.redirect(vercelAuthUrl);
}
