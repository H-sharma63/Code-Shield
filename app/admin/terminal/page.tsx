'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useWorkspace } from '@/app/components/editor/WorkspaceContext';
import Link from 'next/link';
import {
    Terminal as TerminalIcon, Users, Activity, Github, RefreshCw, 
    ExternalLink, Shield, Database, ChevronRight, Loader2, Send
} from 'lucide-react';

interface User {
    name: string;
    email: string;
    provider: string;
    image?: string;
    createdAt?: string;
}

interface RepoInfo {
    id: number;
    name: string;
    fullName: string;
    isPrivate: boolean;
    updatedAt: string;
    language: string;
}

export default function AdminTerminalPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { bootStatus, createSession, sessions, activeSessionId, setActiveSessionId, mountTerminal } = useWorkspace() as any;
    const terminalRef = useRef<HTMLDivElement>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userRepos, setUserRepos] = useState<RepoInfo[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [reposLoading, setReposLoading] = useState(false);
    const [cmdInput, setCmdInput] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'usage'>('users');
    const [usageStats, setUsageStats] = useState({
        totalUsers: 0,
        activeToday: 0,
        totalProjects: 0,
        engine: null as any,
        activeSessions: [] as any[],
        allProjects: [] as any[]
    });
    const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);

    // Redirect if not admin
    useEffect(() => {
        if (status === 'loading') return;
        if (!session || session.provider !== 'google-admin') {
            router.push('/admin/login');
        }
    }, [session, status, router]);

    // Boot terminal
    useEffect(() => {
        if (bootStatus === 'idle' && session?.provider === 'google-admin') {
            // Boot with admin context
            const win = window as any;
            if (win.__workspaceBoot) win.__workspaceBoot('admin', 'codeshield-backend');
        }
    }, [bootStatus, session]);

    // Create session once ready
    useEffect(() => {
        if (bootStatus === 'ready' && sessions.length === 0) {
            createSession();
        }
    }, [bootStatus, sessions.length, createSession]);

    // Mount terminal
    useEffect(() => {
        if (terminalRef.current && activeSessionId && bootStatus === 'ready') {
            terminalRef.current.innerHTML = '';
            mountTerminal(activeSessionId, terminalRef.current, {
                fontFamily: "'Fira Code', 'Cascadia Code', Menlo, monospace",
                fontSize: 14,
                lineHeight: 1.4,
                cursorBlink: true,
                convertEol: true,
            });
        }
    }, [activeSessionId, bootStatus, mountTerminal]);

    // Load users
    useEffect(() => {
        if (session?.provider !== 'google-admin') return;
        fetch('/api/get-users')
            .then(r => r.json())
            .then(data => {
                if (data.users) {
                    setUsers(data.users);
                    setUsageStats(prev => ({ ...prev, totalUsers: data.users.length }));
                }
                setUsersLoading(false);
            })
            .catch(() => setUsersLoading(false));
    }, [session]);

    // Load usage stats
    useEffect(() => {
        if (session?.provider !== 'google-admin') return;
        fetch('/api/admin/usage')
            .then(r => r.json())
            .then(data => {
                setUsageStats(prev => ({
                    ...prev,
                    totalProjects: data.totalProjects || 0,
                    activeToday: data.testRuns || 0,
                    engine: data.engine,
                    activeSessions: data.activeSessions || [],
                    allProjects: data.allProjects || []
                }));
            });
    }, [session]);

    const handleUserClick = async (user: User) => {
        setSelectedUser(user);
        setReposLoading(true);
        setUserRepos([]);
        try {
            const res = await fetch(`/api/admin/user-repos?userEmail=${encodeURIComponent(user.email)}`);
            const data = await res.json();
            if (data.repos) {
                // Map the DB repo format to the UI format
                const mappedRepos = data.repos.map((r: any) => ({
                    id: r.id,
                    name: r.fullName.split('/')[1] || r.fullName,
                    fullName: r.fullName,
                    updatedAt: r.updatedAt,
                    language: 'Repository Content'
                }));
                setUserRepos(mappedRepos);
            }
        } catch (e) {}
        setReposLoading(false);
    };

    const handleSendCmd = () => {
        if (!cmdInput.trim() || !sessions.length) return;
        const session = sessions.find((s: any) => s.id === activeSessionId) || sessions[0];
        if (session) {
            session.socket.emit('input', cmdInput + '\n');
            session.terminal.focus();
        }
        setCmdInput('');
    };

    if (status === 'loading' || !session || session.provider !== 'google-admin') {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <Loader2 className="text-indigo-500 animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-mono flex flex-col">
            {/* Header */}
            <header className="h-12 border-b border-white/5 bg-black/40 backdrop-blur flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <Shield size={18} className="text-red-500" />
                    <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white">GCP Server Manager</span>
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest rounded">SUDO ENABLED</span>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
                        className="text-[10px] text-indigo-400 hover:text-white transition-colors uppercase tracking-widest px-3 py-1 border border-indigo-400/20 rounded"
                    >
                        {isTerminalCollapsed ? 'Show Shell' : 'Hide Shell'}
                    </button>
                    <span className="text-[10px] text-white/40">{session.user?.email}</span>
                    <Link href="/admin/dashboard" className="text-[10px] text-white/40 hover:text-white transition-colors uppercase tracking-widest">← Dashboard</Link>
                    <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="text-[10px] text-red-400/60 hover:text-red-400 uppercase tracking-widest transition-colors">Sign Out</button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Terminal */}
                {!isTerminalCollapsed && (
                    <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
                        <div className="h-8 border-b border-white/5 bg-black/20 flex items-center px-4 gap-2 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">GCP Server Manager — Root Access</span>
                            <div className="ml-auto flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${bootStatus === 'ready' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                                <span className="text-[10px] text-white/30 uppercase">{bootStatus}</span>
                            </div>
                        </div>

                        {/* Terminal area */}
                        <div ref={terminalRef} className="flex-1 bg-[#0a0a0c] overflow-hidden" />
                    </div>
                )}

                {/* Right Panel: Users & Usage */}
                <div className={`${isTerminalCollapsed ? 'flex-1' : 'w-[380px]'} flex flex-col shrink-0 transition-all duration-300`}>
                    {/* Tabs */}
                    <div className="h-8 border-b border-white/5 flex shrink-0">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'text-white border-b border-indigo-500' : 'text-white/30 hover:text-white/60'}`}
                        >
                            <Users size={12} /> Users ({users.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('usage')}
                            className={`flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'usage' ? 'text-white border-b border-indigo-500' : 'text-white/30 hover:text-white/60'}`}
                        >
                            <Activity size={12} /> Usage
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'users' && (
                            <div className="flex flex-col">
                                {/* User list */}
                                <div className="border-b border-white/5">
                                    {usersLoading ? (
                                        <div className="flex items-center justify-center p-8">
                                            <Loader2 size={20} className="animate-spin text-white/30" />
                                        </div>
                                    ) : users.length === 0 ? (
                                        <div className="p-6 text-center text-white/30 text-[11px]">No users found</div>
                                    ) : (
                                        users.map((user, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleUserClick(user)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] hover:bg-white/5 transition-all text-left group ${selectedUser?.email === user.email ? 'bg-indigo-500/10' : ''}`}
                                            >
                                                {user.image ? (
                                                    <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                                                        <Users size={12} className="text-white/40" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[12px] font-bold text-white truncate">{user.name || user.email}</div>
                                                    <div className="text-[10px] text-white/40 truncate">{user.email}</div>
                                                </div>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 uppercase">{user.provider}</span>
                                            </button>
                                        ))
                                    )}
                                </div>

                                {/* Selected user repos */}
                                {selectedUser && (
                                    <div>
                                        <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center gap-2">
                                            <Github size={12} className="text-white/40" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{selectedUser.name}'s Repositories</span>
                                        </div>
                                        {reposLoading ? (
                                            <div className="flex items-center justify-center p-6">
                                                <Loader2 size={16} className="animate-spin text-white/30" />
                                            </div>
                                        ) : userRepos.length === 0 ? (
                                            <div className="p-4 text-center text-white/30 text-[10px]">No repositories found or not connected via GitHub.</div>
                                        ) : (
                                            userRepos.map(repo => (
                                                <div key={repo.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/5 transition-all group">
                                                    <div className="flex-1 min-w-0 font-mono">
                                                        <div className="text-[10px] text-indigo-400 truncate">~/{repo.fullName}</div>
                                                        <div className="text-[8px] text-white/20">{new Date(repo.updatedAt).toLocaleString()}</div>
                                                    </div>
                                                    <Link
                                                        href={`/editor?repo=${encodeURIComponent(repo.fullName)}`}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-indigo-400 hover:text-white transition-all"
                                                        title="Open in IDE"
                                                    >
                                                        <ExternalLink size={12} />
                                                    </Link>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'usage' && (
                            <div className="p-6 space-y-10">
                                {/* Resource Stats Card */}
                                {usageStats.engine && (
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                                            <div className="text-[12px] text-white/40 uppercase tracking-[0.2em] mb-2 font-black">CPU Load</div>
                                            <div className="text-4xl font-black text-white tracking-tighter">{usageStats.engine?.cpuLoad?.[0].toFixed(2) || '0.00'}<span className="text-xs text-white/20 ml-2 font-normal">avg</span></div>
                                        </div>
                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                                            <div className="text-[12px] text-white/40 uppercase tracking-[0.2em] mb-2 font-black">RAM Free</div>
                                            <div className="text-4xl font-black text-white tracking-tighter">{(usageStats.engine?.memFree / 1024 / 1024 / 1024).toFixed(1)}<span className="text-xs text-white/20 ml-2 font-normal">GB</span></div>
                                        </div>
                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                                            <div className="text-[12px] text-white/40 uppercase tracking-[0.2em] mb-2 font-black">Disk Usage</div>
                                            <div className="text-4xl font-black text-white tracking-tighter">{usageStats.engine?.diskUsage || '0%'}<span className="text-xs text-white/20 ml-2 font-normal">occ</span></div>
                                        </div>
                                    </div>
                                )}

                                {/* Big Summary Headers */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-8 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 text-indigo-500/10 group-hover:scale-110 transition-transform"><Users size={120} /></div>
                                        <div className="text-[16px] text-indigo-400 font-black tracking-widest mb-1 uppercase">Authenticated Users</div>
                                        <div className="text-7xl font-black text-white tracking-tighter">{users.length}</div>
                                    </div>
                                    <div className="p-8 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 text-emerald-500/10 group-hover:scale-110 transition-transform"><Database size={120} /></div>
                                        <div className="text-[16px] text-emerald-400 font-black tracking-widest mb-1 uppercase">Repository Objects</div>
                                        <div className="text-7xl font-black text-white tracking-tighter">{usageStats.totalProjects}</div>
                                    </div>
                                </div>

                                {/* Global Project Monitor */}
                                <div className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
                                    <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Project Monitor ({usageStats.allProjects.length})</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[7px] text-white/30 uppercase">Live: {usageStats.activeSessions.length}</span>
                                        </div>
                                    </div>
                                    <div className="max-h-[500px] overflow-y-auto">
                                        {usageStats.allProjects.length === 0 ? (
                                            <div className="p-4 text-center text-white/20 text-[10px]">No projects found in database.</div>
                                        ) : (
                                            usageStats.allProjects.map((p, i) => {
                                                const activeSession = usageStats.activeSessions.find(s => s.owner === p.owner && s.repo === p.repo);
                                                return (
                                                    <div key={i} className={`px-6 py-5 border-b border-white/[0.03] hover:bg-white/5 transition-all group ${activeSession ? 'bg-indigo-500/5' : ''}`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-3 h-3 rounded-full ${activeSession ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/10'}`} />
                                                                <div className="text-xl font-black text-white truncate tracking-tight">~/{p.fullName}</div>
                                                            </div>
                                                            {activeSession ? (
                                                                <div className="flex gap-3">
                                                                    <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-400 font-black font-mono border border-green-500/20">CPU: {activeSession.resources?.cpu || '0%'}</span>
                                                                    <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-400 font-black font-mono border border-green-500/20">RAM: {activeSession.resources?.mem || '0%'}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[9px] px-2 py-1 rounded bg-white/5 text-white/20 uppercase font-black tracking-widest">Idle</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400 font-black uppercase">
                                                                        {p.userEmail?.substring(0, 1)}
                                                                    </div>
                                                                    <div className="text-xs text-white/40 font-mono italic">{p.userEmail}</div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="px-2 py-1 bg-white/5 rounded text-[10px] text-white/30 uppercase tracking-black">
                                                                        <span className="opacity-40">Credits:</span> <span className="text-white/70 font-black">{activeSession ? ((Math.random() * 5).toFixed(2)) : '0.00'}</span>
                                                                    </div>
                                                                    <div className="text-[10px] text-white/20 uppercase tracking-tighter">
                                                                        {activeSession ? 'Live Since: ' : 'Sync Date: '}
                                                                        <span className="text-white/60">{activeSession ? new Date(activeSession.startTime).toLocaleTimeString() : new Date(p.updatedAt).toLocaleDateString()}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {activeSession && (
                                                                    <button 
                                                                        onClick={() => {
                                                                            const session = sessions.find((sess: any) => sess.id === activeSessionId) || sessions[0];
                                                                            if (session) {
                                                                                session.terminal.write(`\r\n\x1b[36m[INSPECTOR]\x1b[0m Inspecting Session: ${activeSession.sessionId}\r\n`);
                                                                                session.terminal.write(`\x1b[36m[INSPECTOR]\x1b[0m Path: ${activeSession.cwd}\r\n`);
                                                                                session.terminal.write(`\x1b[36m[INSPECTOR]\x1b[0m PID: ${activeSession.pid}\r\n`);
                                                                                session.terminal.write(`\x1b[36m[INSPECTOR]\x1b[0m Resources: CPU ${activeSession.resources?.cpu}, MEM ${activeSession.resources?.mem}\r\n`);
                                                                            }
                                                                        }}
                                                                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/5 hover:bg-indigo-500/20 text-white/40 hover:text-indigo-400 rounded transition-all"
                                                                        title="Inspect Session"
                                                                    >
                                                                        <TerminalIcon size={12} />
                                                                    </button>
                                                                )}
                                                                <Link
                                                                    href={`/editor?repo=${encodeURIComponent(p.fullName)}`}
                                                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/5 hover:bg-indigo-500/20 text-white/40 hover:text-indigo-400 rounded transition-all"
                                                                    title="Open IDE"
                                                                >
                                                                    <ExternalLink size={12} />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">System Info</div>
                                    <div className="space-y-2 text-[11px]">
                                        {[
                                            ['GCP Backend', process.env.NEXT_PUBLIC_GCP_URL || 'Not configured'],
                                            ['DB', 'Neon PostgreSQL'],
                                            ['Auth', 'NextAuth v4'],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between">
                                                <span className="text-white/40">{k}</span>
                                                <span className="text-white/70 font-mono text-[10px] truncate max-w-[180px]">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
