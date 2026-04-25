'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Terminal, Bug, Files, Search, ShieldCheck, Network, Activity, X } from 'lucide-react';
import Analysis from '../components/editor/Analysis';
import Debug from '../components/editor/VisualDebugger';
import QualityAudit from '../components/editor/QualityAudit';
import ArchitectureTabView from '../components/editor/ArchitectureTabView';

import { useWorkspace } from '../components/editor/WorkspaceContext';

const EditorV2 = () => {
    const { socket } = useWorkspace();
    const [vscodeUrl, setVscodeUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [connError, setConnError] = useState<boolean>(false);
    const [activeVsCodeFile, setActiveVsCodeFile] = useState<string | null>(null);
    const [activeVsCodeContent, setActiveVsCodeContent] = useState<string>('');
    const [activeVsCodeLanguage, setActiveVsCodeLanguage] = useState<string>('javascript');
    const [activeView, setActiveView] = useState<'analysis' | 'debug' | 'architecture' | 'audit' | null>(null);

    // Bridge Connection
    useEffect(() => {
        if (!socket) return;
        
        const handleActiveFile = (data: { path: string, language?: string, content?: string }) => {
            console.log("VS Code Active File:", data.path);
            setActiveVsCodeFile(data.path);
            if (data.language) setActiveVsCodeLanguage(data.language);
            if (data.content) setActiveVsCodeContent(data.content);
        };

        const handleActiveContent = (data: { path: string, content: string }) => {
            if (data.path === activeVsCodeFile) {
                setActiveVsCodeContent(data.content);
            }
        };

        socket.on('vscode-active-file', handleActiveFile);
        socket.on('vscode-active-content', handleActiveContent);
        return () => {
            socket.off('vscode-active-file', handleActiveFile);
            socket.off('vscode-active-content', handleActiveContent);
        };
    }, [socket, activeVsCodeFile]);

    const handleApplyFix = (customContent?: string) => {
        if (!socket || !activeVsCodeFile) {
            alert("No active file detected in VS Code!");
            return;
        }
        
        socket.emit('vscode-apply-fix', {
            filePath: activeVsCodeFile,
            content: customContent || activeVsCodeContent
        });
    };

    useEffect(() => {
        // Use the static IP from GCP config
        const targetUrl = 'http://34.10.151.8:8081';
        setVscodeUrl(targetUrl);
        
        // Simple health check
        const checkHealth = async () => {
            try {
                const res = await fetch(targetUrl, { mode: 'no-cors' });
                setIsLoading(false);
                setConnError(false);
            } catch (e) {
                console.warn("VS Code Engine not yet responsive...");
                // Don't set error immediately, give it time to boot
            }
        };

        const timer = setTimeout(() => {
            setIsLoading(false);
            setConnError(true);
        }, 15000); // 15s timeout

        const interval = setInterval(checkHealth, 3000);
        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="flex h-screen bg-[#09090b] text-white overflow-hidden font-vscode-ui">
            {/* 1. CodeShield Branding & Neural Sidebar */}
            <div className="w-16 bg-[#121214] border-r border-white/5 flex flex-col items-center py-4 space-y-6 z-50">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
                    <ShieldCheck size={24} className="text-white" />
                </div>
                
                <button className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all group relative" title="Files">
                    <Files size={20} />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100]">Explorer</div>
                </button>
                
                <button 
                    onClick={() => setActiveView(activeView === 'analysis' ? null : 'analysis')}
                    className={`p-3 rounded-xl transition-all group relative ${activeView === 'analysis' ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`} title="Neural Analysis">
                    <Bot size={20} />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100]">Neural Engine</div>
                </button>

                <button 
                    onClick={() => setActiveView(activeView === 'debug' ? null : 'debug')}
                    className={`p-3 rounded-xl transition-all group relative ${activeView === 'debug' ? 'text-red-400 bg-red-500/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`} title="Visual Debugger">
                    <Bug size={20} />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100]">Visual Debugger</div>
                </button>

                <button 
                    onClick={() => setActiveView(activeView === 'architecture' ? null : 'architecture')}
                    className={`p-3 rounded-xl transition-all group relative ${activeView === 'architecture' ? 'text-green-400 bg-green-500/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`} title="Architecture">
                    <Network size={20} />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100]">Architecture View</div>
                </button>

                <button 
                    onClick={() => setActiveView(activeView === 'audit' ? null : 'audit')}
                    className={`p-3 rounded-xl transition-all group relative ${activeView === 'audit' ? 'text-yellow-400 bg-yellow-500/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`} title="Quality Audit">
                    <Activity size={20} />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100]">Quality Audit</div>
                </button>
            </div>

            {/* 1.5 Middle Tool Panel (Dynamic) */}
            {activeView && (
                <div className="w-[350px] bg-[#0a0a0c] border-r border-white/5 flex flex-col relative animate-in slide-in-from-left duration-300">
                    <div className="h-12 border-b border-white/5 flex items-center px-4 shrink-0 bg-[#121214]">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                            {activeView === 'analysis' && 'Neural Analysis'}
                            {activeView === 'debug' && 'Visual Debugger'}
                            {activeView === 'architecture' && 'Architecture'}
                            {activeView === 'audit' && 'Quality Audit'}
                        </span>
                        <button onClick={() => setActiveView(null)} className="ml-auto text-white/40 hover:text-white p-1 rounded-md hover:bg-white/5">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        {activeView === 'analysis' && <Analysis fileContent={activeVsCodeContent} language={activeVsCodeLanguage} />}
                        {activeView === 'debug' && <Debug fileContent={activeVsCodeContent} language={activeVsCodeLanguage} onApplyFix={() => handleApplyFix()} />}
                        {activeView === 'architecture' && <ArchitectureTabView />}
                        {activeView === 'audit' && <QualityAudit />}
                    </div>
                </div>
            )}

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col relative min-w-0">
                {/* Header */}
                <header className="h-12 bg-[#09090b] border-b border-white/5 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">CodeShield <span className="text-indigo-500">Pro</span></span>
                        <div className="h-4 w-px bg-white/5" />
                        <span className="text-[10px] font-mono text-white/20">v2.0-beta-hybrid</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => handleApplyFix()}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeVsCodeFile ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-white/10 text-white/50 cursor-not-allowed'}`}
                        >
                            <Bot size={14} />
                            {activeVsCodeFile ? 'Bridge Connected' : 'Waiting for VS Code...'}
                        </button>
                    </div>
                </header>

                {/* VS Code Frame */}
                <div className="flex-1 bg-[#09090b] relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Igniting VS Code Engine...</span>
                        </div>
                    ) : connError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                                <Terminal size={32} className="text-red-500" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-bold text-white/80">Engine Connection Timeout</span>
                                <p className="text-xs text-white/40 max-w-md leading-relaxed">
                                    The VS Code server at <code className="text-indigo-400">34.10.151.8:8081</code> is not responding. 
                                    This usually means the startup script is still running or the firewall is propagating.
                                </p>
                            </div>
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                                Retry Connection
                            </button>
                        </div>
                    ) : (
                        <iframe 
                            src={vscodeUrl!}
                            className="w-full h-full border-none animate-in fade-in duration-1000"
                            title="VS Code Engine"
                            allow="clipboard-read; clipboard-write; terminal"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditorV2;
