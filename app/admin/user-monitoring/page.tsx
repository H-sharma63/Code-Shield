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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex items-center mb-6">
        <Link href="/admin/dashboard" className="text-blue-500 hover:text-blue-700 text-lg font-semibold inline-block">
          <ArrowLeft className="inline-block mr-2" size={20} strokeWidth={3} />
        </Link>
        <h1 className="flex-grow text-3xl font-bold text-gray-900 text-center">User Monitoring</h1>
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Provider</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-4 text-center">User Statistics</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-700">Total Users</p>
              <p className="text-2xl font-bold text-blue-500">{users.length}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">Admins</p>
              <p className="text-2xl font-bold text-green-500">{adminCount}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">Users</p>
              <p className="text-2xl font-bold text-yellow-500">{userCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold mb-4 text-center">Live User Count</h2>
          <p className="text-4xl font-bold text-purple-500">{liveUserCount}</p>
        </div>
      </div>
    </div>
  );
}