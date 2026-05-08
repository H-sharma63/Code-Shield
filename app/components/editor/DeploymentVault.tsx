'use client';

import React, { useState, useEffect } from 'react';
import { 
    Rocket, 
    ExternalLink, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Github, 
    Globe, 
    Lock,
    RefreshCw,
    Plus,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Deployment {
    id: string;
    url: string;
    status: 'ready' | 'building' | 'error';
    branch: string;
    timestamp: Date;
    commit: string;
}

interface DeploymentVaultProps {
    repoFullName: string | null;
    userEmail: string | null;
    onNotify: (msg: string, type: 'success' | 'error') => void;
}

export const DeploymentVault: React.FC<DeploymentVaultProps> = ({ repoFullName, userEmail, onNotify }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [deployments, setDeployments] = useState<Deployment[]>([]);

    useEffect(() => {
        // Check if connected (we can try to fetch deployments, if it returns 401, we aren't connected)
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            const res = await fetch('/api/vercel/deployments');
            if (res.ok) {
                setIsConnected(true);
                const data = await res.json();
                if (data.deployments) {
                    setDeployments(data.deployments.map((d: any) => ({
                        id: d.uid,
                        url: d.url,
                        status: d.state === 'READY' ? 'ready' : (d.state === 'ERROR' ? 'error' : 'building'),
                        branch: d.meta?.githubCommitRef || 'main',
                        timestamp: new Date(d.createdAt),
                        commit: d.meta?.githubCommitMessage || 'Initial Deployment'
                    })));
                }
            }
        } catch (e) {
            console.error("Vercel connection check failed", e);
        }
    };

    const handleConnectVercel = () => {
        // Redirect to our OAuth start route
        window.location.href = '/api/vercel/auth';
    };

    const handleTriggerDeploy = async () => {
        if (!projectName.trim()) {
            onNotify("Please enter a Vercel Project Name", "error");
            return;
        }

        setIsDeploying(true);
        try {
            const res = await fetch('/api/vercel/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    projectName: projectName.trim(), 
                    repoFullName, 
                    userEmail 
                })
            });
            const data = await res.json();
            if (res.ok) {
                onNotify("Deployment triggered successfully!", "success");
                checkConnection(); // Refresh history
            } else {
                onNotify(data.error || "Deployment failed", "error");
            }
        } catch (e) {
            onNotify("Failed to trigger deployment", "error");
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#050508] border-l border-white/5 font-exo overflow-hidden">
            {/* HEADER */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 bg-black/40 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                        <Rocket size={16} className="text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Deployment Vault</h2>
                        <span className="text-[7px] font-black uppercase tracking-widest text-white/20">Vercel Integration</span>
                    </div>
                </div>
                <button 
                    onClick={checkConnection}
                    className="p-2 text-white/20 hover:text-white transition-all"
                >
                    <RefreshCw size={14} className={isDeploying ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                
                {/* CONNECTION CARD */}
                <div className={`p-6 rounded-3xl border transition-all ${isConnected ? 'bg-white/[0.02] border-white/10' : 'bg-white/[0.05] border-dashed border-white/20 border-2'}`}>
                    {isConnected ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Globe size={18} className="text-blue-400" />
                                    <div className="text-xs font-black uppercase tracking-wider text-white/80 italic">Connected to Vercel</div>
                                </div>
                                <div className="px-2 py-0.5 bg-green-500/20 border border-green-500/40 rounded text-[7px] text-green-400 font-black uppercase tracking-widest">Active</div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-4 text-[10px] text-white/40 font-medium">
                                    <div className="flex items-center gap-1.5"><Github size={12} /> {repoFullName || 'No repo'}</div>
                                    <div className="flex items-center gap-1.5"><Lock size={12} /> Production</div>
                                </div>
                                <div className="mt-2">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-1">Vercel Project Name</label>
                                    <input 
                                        type="text"
                                        placeholder="Enter project name..."
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-orange-500/40"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center py-4 space-y-4">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20"><Plus size={24} /></div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Connect with Vercel</h3>
                                <p className="text-[9px] text-white/20 mt-2 leading-relaxed">Login with Vercel to enable auto-deployments and environment sync.</p>
                            </div>
                            <button 
                                onClick={handleConnectVercel}
                                className="w-full py-3 bg-white text-black font-black uppercase text-[9px] tracking-[0.2em] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Connect with Vercel
                            </button>
                        </div>
                    )}
                </div>

                {/* DEPLOY ACTION */}
                {isConnected && (
                    <button 
                        onClick={handleTriggerDeploy}
                        disabled={isDeploying || !projectName}
                        className={`w-full group relative overflow-hidden p-6 rounded-3xl bg-transparent border flex flex-col items-center gap-2 transition-all ${isDeploying || !projectName ? 'border-white/10 opacity-50 cursor-not-allowed' : 'border-orange-500/50 hover:bg-orange-500/5'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <Rocket size={24} className={`text-orange-400 ${isDeploying ? 'animate-bounce' : 'group-hover:-translate-y-1 transition-transform'}`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/80">Ship current snapshot</span>
                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest italic">Sync Env & Trigger Vercel Build</span>
                    </button>
                )}

                {/* HISTORY */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-white/30">Deployment History</h3>
                        <Activity size={10} className="text-white/20" />
                    </div>
                    
                    <div className="space-y-3">
                        {deployments.map((deploy) => (
                            <motion.div 
                                key={deploy.id}
                                whileHover={{ x: 4 }}
                                className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {deploy.status === 'ready' ? (
                                            <CheckCircle2 size={12} className="text-green-500" />
                                        ) : deploy.status === 'building' ? (
                                            <RefreshCw size={12} className="text-blue-500 animate-spin" />
                                        ) : (
                                            <AlertCircle size={12} className="text-red-500" />
                                        )}
                                        <span className="text-[9px] font-black uppercase tracking-wider text-white/60">{deploy.branch}</span>
                                    </div>
                                    <span className="text-[7px] font-mono text-white/20">{deploy.timestamp.toLocaleTimeString()}</span>
                                </div>
                                <div className="text-[10px] font-bold text-white/40 mb-3 truncate group-hover:text-white/60 transition-colors">
                                    {deploy.commit}
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-white/[0.03]">
                                    <div className="flex items-center gap-1.5">
                                        <Globe size={10} className="text-white/20" />
                                        <span className="text-[8px] font-mono text-white/30 truncate max-w-[150px]">{deploy.url}</span>
                                    </div>
                                    <button className="p-1 text-white/20 hover:text-blue-400 transition-colors">
                                        <ExternalLink size={12} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CLOUD STATUS FOOTER */}
            <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Infrastructure Stable</span>
                </div>
                <span className="text-[7px] font-mono text-white/10 italic">Lvl 4 Edge Nodes</span>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default DeploymentVault;
