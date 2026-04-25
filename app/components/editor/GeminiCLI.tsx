'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
    Terminal, 
    Sparkles, 
    Command, 
    Send, 
    Cpu, 
    Layers, 
    Search,
    Wand2,
    Bug,
    Rocket,
    X,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace } from './WorkspaceContext';

interface CLILine {
    id: string;
    type: 'input' | 'output' | 'error' | 'neural';
    content: string;
    timestamp: Date;
    suggestion?: string;
}

export const GeminiCLI: React.FC = () => {
    const { selectedModel, activeTabId, tabs } = useWorkspace() as any;
    const [history, setHistory] = useState<CLILine[]>([
        {
            id: '1',
            type: 'neural',
            content: 'CodeShield Neural Console v9.1 initialized. Operational status: PLATINUM.',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const handleExecute = async () => {
        if (!input.trim() || isProcessing) return;

        const cmd = input.trim();
        const userLine: CLILine = {
            id: Date.now().toString(),
            type: 'input',
            content: cmd,
            timestamp: new Date()
        };

        setHistory(prev => [...prev, userLine]);
        setInput('');
        setIsProcessing(true);

        try {
            // Check for slash commands
            if (cmd.startsWith('/')) {
                const action = cmd.split(' ')[0];
                switch (action) {
                    case '/analyze':
                        setHistory(prev => [...prev, { id: 'a', type: 'neural', content: 'Triggering global analysis pulse...', timestamp: new Date() }]);
                        break;
                    case '/refactor':
                        setHistory(prev => [...prev, { id: 'r', type: 'neural', content: 'Neural Refactor pipeline active. Awaiting target...', timestamp: new Date() }]);
                        break;
                    default:
                        setHistory(prev => [...prev, { id: 'd', type: 'error', content: `Unrecognized command sequence: ${action}`, timestamp: new Date() }]);
                }
                setIsProcessing(false);
                return;
            }

            // Normal AI reasoning
            const response = await fetch('/api/analyze-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: tabs.find((t: any) => t.id === activeTabId)?.content || 'No context',
                    analysisType: 'chat',
                    modelId: selectedModel,
                    context: `CLI Instruction: ${cmd}`
                })
            });

            const data = await response.json();
            setHistory(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'neural',
                content: data.explanation || "Execution verified. Logic stable.",
                timestamp: new Date()
            }]);
        } catch (e) {
            setHistory(prev => [...prev, { id: 'e', type: 'error', content: 'Neural link saturation. Transmission failed.', timestamp: new Date() }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#050508] font-mono overflow-hidden">
            {/* TERMINAL HEADER */}
            <div className="h-10 border-b border-white/5 bg-black/40 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-white/30" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Gemini Neural Shell</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-green-500/50">Neural Link Active</span>
                </div>
            </div>

            {/* CLI BUFFER */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar"
            >
                {history.map((line) => (
                    <div key={line.id} className="animate-in fade-in slide-in-from-left-2 duration-300">
                        {line.type === 'input' && (
                            <div className="flex gap-3 text-white/90">
                                <span className="text-indigo-400 font-black">❯</span>
                                <span className="text-[12px]">{line.content}</span>
                            </div>
                        )}
                        {line.type === 'neural' && (
                            <div className="flex gap-3 py-1">
                                <Sparkles size={12} className="text-indigo-400 mt-1 shrink-0" />
                                <div className="text-[12px] text-indigo-100/70 leading-relaxed italic font-vscode-ui">
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
                         <Loader2 size={12} className="text-indigo-400 animate-spin" />
                         <span className="text-[10px] text-indigo-400/50 uppercase tracking-widest font-black">Synthesizing Neural Result...</span>
                    </div>
                )}
            </div>

            {/* COMMAND HUD (Suggestions) */}
            <div className="px-6 py-3 border-t border-white/5 bg-black/20 flex gap-4 overflow-x-auto no-scrollbar shrink-0">
                <button onClick={() => setInput('/analyze')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all whitespace-nowrap">
                    <Search size={10} /> /analyze
                </button>
                <button onClick={() => setInput('/refactor')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all whitespace-nowrap">
                    <Wand2 size={10} /> /refactor
                </button>
                <button onClick={() => setInput('/debug')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all whitespace-nowrap">
                    <Bug size={10} /> /debug
                </button>
                <button onClick={() => setInput('/ship')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all whitespace-nowrap">
                    <Rocket size={10} /> /ship
                </button>
            </div>

            {/* CLI INPUT */}
            <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-indigo-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
                    <div className="relative flex items-center bg-[#09090b] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                         <div className="pl-4 text-indigo-400"><ChevronRight size={16} strokeWidth={3} /></div>
                         <input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                            placeholder="Awaiting instruction..."
                            className="w-full bg-transparent p-4 text-[13px] text-white outline-none placeholder:text-white/10 placeholder:uppercase placeholder:tracking-widest font-mono"
                         />
                         <button 
                            onClick={handleExecute}
                            disabled={!input.trim() || isProcessing}
                            className="p-4 text-white/20 hover:text-indigo-400 transition-all disabled:opacity-0"
                         >
                            <Command size={16} />
                         </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(129, 140, 248, 0.1); border-radius: 10px; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default GeminiCLI;
