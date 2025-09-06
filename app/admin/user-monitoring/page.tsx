'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { usePusher } from '../../components/PusherContext';

interface User {
  name: string;
  email: string;
  provider: string;
  role: string;
}

export default function UserMonitoringPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { liveUserCount } = usePusher(); // Consume liveUserCount from context

  useEffect(() => {
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
  }, []);

  const adminCount = users.filter(user => user.provider === 'google-admin').length;
  const userCount = users.length - adminCount;

  return (
    <div className="min-h-screen bg-base p-8">
      <div className="flex items-center mb-6">
        <Link href="/admin/dashboard" className="text-primaryAccent hover:opacity-80 text-lg font-semibold inline-block">
          <ArrowLeft className="inline-block mr-2" size={20} strokeWidth={3} />
        </Link>
        <h1 className="flex-grow text-3xl font-bold text-textPrimary text-center">User Monitoring</h1>
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : (
        <div className="bg-cardPanel shadow overflow-hidden sm:rounded-lg mb-8">
          <table className="min-w-full divide-y divide-borderLine">
            <thead className="bg-cardPanel">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-textSecondary uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-textSecondary uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-textSecondary uppercase tracking-wider">Provider</th>
              </tr>
            </thead>
            <tbody className="bg-cardPanel divide-y divide-borderLine">
              {users.map((user, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textPrimary">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-textSecondary">{user.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-cardPanel rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-4 text-center text-textPrimary">User Statistics</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-textSecondary">Total Users</p>
              <p className="text-2xl font-bold text-primaryAccent">{users.length}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-textSecondary">Admins</p>
              <p className="text-2xl font-bold text-logoutButton">{adminCount}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-textSecondary">Users</p>
              <p className="text-2xl font-bold text-secondaryAccent">{userCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-cardPanel rounded-lg shadow p-4 flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold mb-4 text-center text-textPrimary">Live User Count</h2>
          <p className="text-4xl font-bold text-highlight">{liveUserCount}</p>
        </div>
      </div>
    </div>
  );
}