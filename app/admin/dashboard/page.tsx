
'use client'

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link";

interface User {
  name: string;
  email: string;
  provider: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return // Do nothing while loading
    if (!session || session.provider !== 'google-admin') {
      router.push('/admin/login')
    } else {
      fetch('/api/get-users')
        .then(res => res.json())
        .then(data => {
          if (data.users) {
            setUsers(data.users);
          } else {
            setError('Could not fetch users.');
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Could not fetch users.');
          setLoading(false);
        });
    }
  }, [session, status, router])

  if (status === 'loading' || !session || session.provider !== 'google-admin') {
    return <div>Loading...</div> // Or a spinner component
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-x font-bold text-gray-600">Welcome, {session.user?.name} ({session.user?.email})</p>
            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-[20px]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <Link href="/admin/user-monitoring">
                <div className="bg-white rounded-lg shadow p-4 h-40 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-shadow duration-200">
                  <p className="text-lg font-semibold mb-2">User Monitoring</p>
                  <button className="w-[250px] bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-[20px]">
                    Go to User Monitoring
                  </button>
                </div>
              </Link>
              <div className="bg-white rounded-lg shadow p-4 h-40 flex flex-col items-center justify-center">
                <p className="text-lg font-semibold mb-2">Content</p>
                <button className="w-[250px] bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-[20px]">
                  Go to Content
                </button>
              </div>
              <div className="bg-white rounded-lg shadow p-4 h-40 flex flex-col items-center justify-center">
                <p className="text-lg font-semibold mb-2">Error Monitoring</p>
                <button className="w-[250px] bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-[20px]">
                  Go to Error Monitoring
                </button>
              </div>
              <div className="bg-white rounded-lg shadow p-4 h-40 flex flex-col items-center justify-center">
                <p className="text-lg font-semibold mb-2">API Usage</p>
                <button className="w-[250px] bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-[20px]">
                  Go to API Usage
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
)
}
