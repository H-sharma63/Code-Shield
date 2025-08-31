'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Pusher, { PresenceChannel } from 'pusher-js';
import { PusherContext } from './PusherContext';

export default function PusherProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [liveUserCount, setLiveUserCount] = useState(0);

  useEffect(() => {
    if (session) {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/presence',
      });

      const channel = pusher.subscribe('presence-user-monitoring') as PresenceChannel;

      channel.bind('pusher:subscription_succeeded', () => {
        setLiveUserCount(channel.members.count);
      });
      channel.bind('pusher:member_added', () => {
        setLiveUserCount(channel.members.count);
      });
      channel.bind('pusher:member_removed', () => {
        setLiveUserCount(channel.members.count);
      });

      return () => {
        pusher.unsubscribe('presence-user-monitoring');
      };
    }
  }, [session]);

  return (
    <PusherContext.Provider value={{ liveUserCount }}>
      {children}
    </PusherContext.Provider>
  );
}