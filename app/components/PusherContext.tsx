'use client';

import { createContext, useContext } from 'react';

interface PusherContextType {
  liveUserCount: number;
}

export const PusherContext = createContext<PusherContextType>({
  liveUserCount: 0,
});

export const usePusher = () => {
  return useContext(PusherContext);
};
