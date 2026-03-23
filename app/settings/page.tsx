'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Github, Settings as SettingsIcon, Globe, Lock, ExternalLink, RefreshCw, AlertCircle, Edit } from 'lucide-react';

interface Repo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  isPrivate: boolean;
  updatedAt: string;
  language: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchRepos = async () => {
    if (loading && hasFetched) return; // Prevent concurrent fetches
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/github/repos');
      const data = await response.json();
      if (response.ok) {
        setRepos(data.repos);
        setHasFetched(true);
      } else {
        if (data.error === 'NOT_CONNECTED') {
            setError('Please connect your GitHub account to see repositories.');
        } else {
            setError(data.message || 'Failed to fetch repositories.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.provider === 'github' && !hasFetched) {
      fetchRepos();
    } else if (status === 'authenticated' && session?.provider !== 'github') {
        setLoading(false);
    }
  }, [session, status, hasFetched]);

  if (status === 'loading') return <div className="p-8 text-textPrimary">Loading...</div>;

  return (
    <div className="min-h-screen bg-base p-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Sidebar: Account Info */}
        <div className="space-y-6">
          <div className="bg-cardPanel p-6 rounded-lg shadow-lg border border-borderLine">
            <h2 className="text-xl font-bold text-textPrimary mb-4">Account Profile</h2>
            <div className="flex flex-col items-center text-center">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Avatar" className="w-24 h-24 rounded-full mb-4 border-2 border-primaryAccent" />
              ) : (
                <div className="w-24 h-24 bg-gray-700 rounded-full mb-4 flex items-center justify-center">
                  <Github size={48} className="text-gray-400" />
                </div>
              )}
              <p className="text-lg font-bold text-textPrimary">{session?.user?.name || 'User'}</p>
              <p className="text-sm text-textSecondary mb-4">{session?.user?.email}</p>
              <div className="px-3 py-1 bg-highlight/20 text-highlight text-xs rounded-full uppercase tracking-widest font-bold">
                Connected via {session?.provider || 'Unknown'}
              </div>
            </div>
          </div>

          <div className="bg-cardPanel p-6 rounded-lg shadow-lg border border-borderLine">
            <h2 className="text-xl font-bold text-textPrimary mb-4">App Preferences</h2>
            <div className="space-y-4 text-textSecondary text-sm">
              <div className="flex justify-between items-center">
                <span>Theme</span>
                <span className="text-highlight font-bold">Dark (Default)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>IDE Layout</span>
                <span className="text-highlight font-bold">Tabbed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: GitHub Repositories */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-cardPanel p-6 rounded-lg shadow-lg border border-borderLine">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <Github size={24} className="text-textPrimary" />
                <h2 className="text-2xl font-bold text-textPrimary">Your GitHub Repositories</h2>
              </div>
              {session?.provider === 'github' && (
                <button 
                  onClick={fetchRepos}
                  className="p-2 hover:bg-highlight/20 rounded-full transition-colors duration-200 text-highlight"
                  title="Refresh Repositories"
                >
                  <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
              )}
            </div>

            {session?.provider !== 'github' ? (
              <div className="text-center py-12 bg-base rounded-lg border border-dashed border-borderLine">
                <AlertCircle className="mx-auto text-textSecondary mb-4" size={48} />
                <p className="text-textSecondary mb-6">You are currently logged in with {session?.provider}. To see your repositories, please log in with GitHub.</p>
                <button 
                  onClick={() => signIn('github')}
                  className="bg-primaryAccent hover:opacity-80 text-white font-bold py-2 px-6 rounded-[20px] inline-flex items-center space-x-2"
                >
                  <Github size={20} />
                  <span>Connect GitHub</span>
                </button>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-base animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-logoutButton">
                <p>{error}</p>
              </div>
            ) : repos.length === 0 ? (
              <p className="text-textSecondary text-center py-8">No repositories found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {repos.map(repo => (
                  <div key={repo.id} className="bg-base p-4 rounded-lg border border-borderLine hover:border-highlight transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          {repo.isPrivate ? <Lock size={14} className="text-secondaryAccent" /> : <Globe size={14} className="text-highlight" />}
                          <h3 className="font-bold text-textPrimary text-lg group-hover:text-highlight truncate max-w-[300px]">{repo.name}</h3>
                        </div>
                        <p className="text-sm text-textSecondary line-clamp-1 mb-2">{repo.description || "No description provided."}</p>
                        <div className="flex items-center space-x-4">
                          {repo.language && (
                            <span className="text-[10px] bg-cardPanel px-2 py-0.5 rounded text-textSecondary border border-borderLine">
                              {repo.language}
                            </span>
                          )}
                          <span className="text-[10px] text-textSecondary italic">
                            Updated {new Date(repo.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link 
                          href={`/editor?repo=${encodeURIComponent(repo.fullName)}`}
                          className="p-2 bg-primaryAccent/10 text-primaryAccent hover:bg-primaryAccent hover:text-white rounded-md transition-all duration-200"
                          title="Edit in IDE"
                        >
                          <Edit size={18} />
                        </Link>
                        <a 
                          href={repo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-textSecondary hover:text-highlight transition-colors duration-200"
                        >
                          <ExternalLink size={18} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
