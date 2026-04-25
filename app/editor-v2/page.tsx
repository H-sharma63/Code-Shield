'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Terminal, Bug, Files, Search, ShieldCheck } from 'lucide-react';

const EditorV2 = () => {
    const [vscodeUrl, setVscodeUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Future: Fetch the code-server URL from the backend
        // For now, assume it runs on localhost:8080 during testing
        setVscodeUrl('http://localhost:8080/?folder=/path/to/project');
        setIsLoading(false);
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
                
                <button className="p-3 text-indigo-400 bg-indigo-500/10 rounded-xl transition-all group relative" title="Neural Analysis">
                    <Bot size={20} />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100]">Neural Engine</div>
                </button>

                <div className="flex-1" />

                <button className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all" title="Settings">
                    <Bug size={20} />
                </button>
            </div>

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
                        <button className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                            <Bot size={14} />
                            Apply Neural Fix
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
                    ) : (
                        <iframe 
                            src={vscodeUrl!}
                            className="w-full h-full border-none"
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
