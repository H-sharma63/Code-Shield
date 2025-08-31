import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Pusher from 'pusher';

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.text();
  const params = new URLSearchParams(data);
  const socketId = params.get('socket_id');
  const channel = params.get('channel_name');

  if (!socketId || !channel) {
    return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
  }

  const userData = {
    user_id: socketId!,
    user_info: {
      name: session.user.name!,
      email: session.user.email!,
    },
  };

  const authResponse = pusher.authorizeChannel(socketId, channel, userData);
  return new Response(JSON.stringify(authResponse));
}