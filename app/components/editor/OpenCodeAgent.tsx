'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
    Terminal, 
    Sparkles, 
    Command, 
    Bot,
    Search,
    Wand2,
    Bug,
    Hammer,
    X,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { useWorkspace } from './WorkspaceContext';

interface CLILine {
    id: string;
    type: 'input' | 'output' | 'error' | 'agent';
    content: string;
    timestamp: Date;
}

export const OpenCodeAgent: React.FC = () => {
    const { selectedModel, activeTabId, tabs, repoFullName } = useWorkspace() as any;
    const [history, setHistory] = useState<CLILine[]>([
        {
            id: '1',
            type: 'agent',
            content: 'OpenCode Initialized. I am your autonomous AI pair programmer for this repository.',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    useEffect(() => {
        const handleCtrlP = () => {
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 100);
        };
        window.addEventListener('opencode-ctrl-p', handleCtrlP);
        return () => window.removeEventListener('opencode-ctrl-p', handleCtrlP);
    }, []);

    const handleExecute = async (overrideCmd?: string) => {
        const cmd = (overrideCmd || input).trim();
        if (!cmd || isProcessing) return;

        const userLine: CLILine = {
            id: Date.now().toString(),
            type: 'input',
            content: cmd,
            timestamp: new Date()
        };

        setHistory(prev => [...prev, userLine]);
        if (!overrideCmd) setInput('');
        setIsProcessing(true);

        try {
            const response = await fetch('/api/analyze-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: tabs.find((t: any) => t.id === activeTabId)?.content || 'No specific file context, utilizing repository context if requested.',
                    analysisType: 'chat',
                    modelId: 'opencode/big-pickle', // Hardcoded representation
                    context: `OpenCode Agent Prompt for repo: ${repoFullName || 'Unknown'}\nInstruction: ${cmd}`
                })
            });

            const data = await response.json();
            setHistory(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'agent',
                content: data.explanation || "Execution verified. Analysis Complete.",
                timestamp: new Date()
            }]);
        } catch (e) {
            setHistory(prev => [...prev, { id: `err-${Date.now()}`, type: 'error', content: 'Agent connection failed. Check your network or API keys.', timestamp: new Date() }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#050508] font-mono overflow-hidden">
            {/* HEADER */}
            <div className="h-10 border-b border-white/5 bg-black/40 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white">opencode</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#569cd6]">Big Pickle Active</span>
                </div>
            </div>

            {/* CHAT BUFFER */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
            >
                {history.map((line) => (
                    <div key={line.id} className="animate-in fade-in slide-in-from-left-2 duration-300">
                        {line.type === 'input' && (
                            <div className="flex gap-3 text-white/90">
                                <span className="text-[#569cd6] font-black">❯</span>
                                <span className="text-[12px] whitespace-pre-wrap">{line.content}</span>
                            </div>
                        )}
                        {line.type === 'agent' && (
                            <div className="flex gap-3 py-1">
                                <Bot size={14} className="text-[#569cd6] mt-0.5 shrink-0" />
                                <div className="text-[12px] text-white/70 leading-relaxed font-sans">
                                    {line.content}
                                </div>
                            </div>
                        )}
                        {line.type === 'error' && (
                            <div className="flex gap-3 text-red-400/80 italic text-[11px] py-1">
                                <X size={12} className="mt-0.5 shrink-0" />
                                <span>{line.content}</span>
                            </div>
                        )}
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex gap-3 py-2 animate-pulse">
                         <Loader2 size={12} className="text-[#569cd6] animate-spin" />
                         <span className="text-[10px] text-[#569cd6]/50 uppercase tracking-widest font-black">Agent is thinking...</span>
                    </div>
                )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="px-6 py-3 border-t border-white/5 bg-black/20 flex gap-4 shrink-0">
                <button onClick={() => handleExecute('Build project architecture')} className="flex items-center gap-2 px-3 py-1 rounded-sm text-[10px] font-bold text-[#569cd6] hover:bg-white/5 transition-all whitespace-nowrap">
                    Build
                </button>
                <button onClick={() => handleExecute('Analyze with Big Pickle')} className="flex items-center gap-2 px-3 py-1 rounded-sm text-[10px] font-bold text-white hover:bg-white/5 transition-all whitespace-nowrap">
                    Big Pickle
                </button>
                <button onClick={() => handleExecute('Activate OpenCode Zen')} className="flex items-center gap-2 px-3 py-1 rounded-sm text-[10px] font-bold text-white/50 hover:bg-white/5 hover:text-white transition-all whitespace-nowrap">
                    OpenCode Zen
                </button>
            </div>

            {/* CLI INPUT */}
            <div className="p-4 border-t border-white/5 bg-[#1e1e1e] shrink-0">
                <div className="relative group">
                    <div className="relative flex items-center bg-[#252526] border border-white/10 rounded-sm overflow-hidden">
                         <input 
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                            placeholder="Ask anything... &quot;Fix a TODO in the codebase&quot;"
                            className="w-full bg-transparent p-3 px-4 text-[13px] text-white outline-none placeholder:text-white/40 font-mono"
                         />
                         <button 
                            onClick={() => handleExecute()}
                            disabled={!input.trim() || isProcessing}
                            className="p-3 text-white/40 hover:text-white transition-all disabled:opacity-0"
                         >
                            <Command size={14} />
                         </button>
                    </div>
                </div>
                 <div className="flex justify-between items-center mt-2 px-2 text-[10px] text-white/40 uppercase tracking-wider">
                     <span>{repoFullName || ''}</span>
                     <div className="flex gap-4">
                         <span><strong className="text-white">tab</strong> agents</span>
                         <span><strong className="text-white">ctrl+p</strong> commands</span>
                     </div>
                 </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default OpenCodeAgent;
