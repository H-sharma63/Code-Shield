'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import CreateProjectModal from '@/app/components/CreateProjectModal';
import {
  Plus,
  Folder,
  Clock,
  Activity as ActivityIcon,
  ChevronRight,
  Shield,
  FileCode,
  AlertCircle,
  Github,
  Lock,
  ExternalLink,
  Code,
  Zap
} from 'lucide-react';

interface Project {
  id: number;
  projectName: string;
  fileName: string;
  blobUrl: string;
  updatedAt: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  isPrivate: boolean;
  updatedAt: string;
  language: string;
}

interface ActivityItem {
  id: number;
  projectName: string;
  fileName: string;
  eventType: 'created' | 'edited';
  eventTimestamp: string;
}

const timeSince = (date: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session && !fetchedRef.current) {
      fetchedRef.current = true;
      const fetchData = async () => {
        try {
          const endpoints = [
            fetch('/api/get-activity')
          ];

          const githubActive = (session as any).provider === 'github';
          if (githubActive) {
            endpoints.push(fetch('/api/github/repos'));
          }

          const results = await Promise.all(endpoints);
          const activityData = await results[0].json();

          if (activityData.activities) setActivities(activityData.activities);

          if (githubActive && results[1]) {
            const reposData = await results[1].json();
            if (reposData.repos) setRepos(reposData.repos);
          }

          setLoading(false);
        } catch (err) {
          setError('Failed to synchronize dashboard telemetry.');
          setLoading(false);
        }
      };
      fetchData();
    } else if (!session && status !== 'loading') {
        setLoading(false);
    }
  }, [session, status]);
  return (
    <div className="min-h-screen bg-[#060608] text-textPrimary selection:bg-white/10">
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />

      {/* Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primaryAccent/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-secondaryAccent/5 rounded-full blur-[120px]"></div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono uppercase tracking-[0.3em] mb-3">
              <Shield size={12} /> System Overlook
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-exo">
              Hello, {session?.user?.name?.split(' ')[0]}
            </h1>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="group flex items-center gap-2 px-6 py-3 bg-white text-[#060608] font-bold rounded-xl hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-white/5 font-exo"
          >
            <Plus size={18} /> New Project
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Connected Mainframe</p>
            <p className="text-3xl font-bold text-white">{repos.length}</p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Security Audits</p>
            <p className="text-3xl font-bold text-white">{activities.length}</p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">System Health</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-lg font-bold text-white uppercase tracking-tighter">Optimal</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Workspace Column */}
          <div className="lg:col-span-2 space-y-12">

            {/* GITHUB REPOSITORIES SECTION */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Github size={20} className="text-white/40" /> GitHub Repositories
                </h2>
                {(session as any)?.provider !== 'github' && (
                  <button
                    onClick={() => { const { signIn } = require('next-auth/react'); signIn('github'); }}
                    className="text-[10px] font-mono font-bold uppercase tracking-widest text-primaryAccent hover:text-white transition-colors flex items-center gap-2"
                  >
                    Connect GitHub <ExternalLink size={12} />
                  </button>
                )}
              </div>

              {error && (
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex flex-col gap-4 text-red-400 text-sm mb-12">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} /> <p className="font-bold">{error}</p>
                  </div>
                </div>
              )}

              {(session as any)?.provider !== 'github' ? (
                <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center bg-white/[0.02]">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Github className="text-white/20" size={24} />
                  </div>
                  <p className="text-white/40 text-sm font-medium mb-6 font-exo">
                    GitHub is not connected to this session.
                  </p>
                </div>
              ) : repos.length === 0 ? (
                <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center bg-white/[0.02]">
                  <p className="text-white/40 text-sm font-medium font-exo">
                    No GitHub repositories found.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {repos.slice(0, 4).map((r) => (
                    <div
                      key={`repo-${r.id}`}
                      className="group p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 relative overflow-hidden cursor-pointer"
                      onClick={() => router.push(`/editor?repo=${r.fullName}`)}
                    >
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-white/40 group-hover:text-primaryAccent transition-colors">
                            <Code size={20} />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-1 border rounded text-[9px] font-mono uppercase tracking-tighter bg-white/5 border-white/10 text-white/40">
                              GitHub
                            </div>
                            {r.isPrivate && (
                              <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-white/20 uppercase tracking-tighter">
                                <Lock size={10} />
                              </div>
                            )}
                          </div>
                        </div>
                        <h3 className="text-base font-bold text-white mb-2 group-hover:text-primaryAccent transition-colors truncate font-exo">
                          {r.name}
                        </h3>
                        <p className="text-xs text-white/30 line-clamp-2 h-8 font-medium mb-4">
                          {r.description || "No description protocol available."}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-[10px] font-mono text-white/40 uppercase tracking-tighter flex items-center gap-1">
                            <Github size={10} /> Remote_Sync
                          </span>
                          <span className="text-[10px] font-mono text-white/20 uppercase tracking-tighter">
                            {timeSince(r.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Activity Column */}
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-8">
              <ActivityIcon size={20} className="text-white/40" /> Kernel Logs
            </h2>
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.slice(0, 6).map((activity) => (
                  <div
                    key={`${activity.id}-${activity.eventType}`}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.08] transition-all group"
                  >
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <p className="text-[13px] font-medium text-white/80 leading-snug">
                        <span className="text-white font-bold group-hover:text-secondaryAccent transition-colors">{activity.projectName}</span>
                        {activity.eventType === 'created' ? ' audit initialized.' : ' patch applied.'}
                      </p>
                      <span className="text-[10px] font-mono text-white/20 shrink-0 mt-1 uppercase">
                        {timeSince(activity.eventTimestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${activity.eventType === 'created' ? 'bg-primaryAccent shadow-[0_0_8px_#12c2e9]' : 'bg-secondaryAccent shadow-[0_0_8px_#c471f5]'}`}></div>
                      <span className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">
                        STATUS: VERIFIED
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center">
                  <p className="text-white/20 italic text-[10px] uppercase tracking-widest font-bold">No telemetry recorded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
