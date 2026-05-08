import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/editor?error=' + error, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/editor?error=no_code', request.url));
  }

  const clientId = process.env.VERCEL_CLIENT_ID;
  const clientSecret = process.env.VERCEL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/editor?error=env_vars_missing', request.url));
  }

  const redirectUri = process.env.VERCEL_REDIRECT_URI || 'http://localhost:3000/api/vercel/callback';

  try {
    const response = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const bodyText = await response.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      return NextResponse.redirect(new URL(`/editor?error=token_exchange_failed&details=RawResponse:${encodeURIComponent(bodyText.substring(0, 100))}`, request.url));
    }

    if (data.access_token) {
      (await cookies()).set('vercel_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return NextResponse.redirect(new URL('/editor?vercel=connected', request.url));
    } else {
      const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error_description || data.error || JSON.stringify(data));
      return NextResponse.redirect(new URL(`/editor?error=token_exchange_failed&details=${encodeURIComponent(errorMsg)}`, request.url));
    }
  } catch (err) {
    console.error('Vercel Auth Error:', err);
    return NextResponse.redirect(new URL('/editor?error=auth_error', request.url));
  }
}