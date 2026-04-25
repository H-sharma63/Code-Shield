'use client'

import { SessionProvider } from 'next-auth/react'
import { WorkspaceProvider } from './components/editor/WorkspaceContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WorkspaceProvider>
        {children}
      </WorkspaceProvider>
    </SessionProvider>
  )
}