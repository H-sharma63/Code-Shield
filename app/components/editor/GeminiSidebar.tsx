'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
    Send, 
    Sparkles, 
    User, 
    Bot, 
    Loader2, 
    Terminal, 
    Wand2, 
    Code2,
    X,
    Maximize2,
    MessageSquare,
    Zap,
    Cpu,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace } from './WorkspaceContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'text' | 'code' | 'thought';
}

export const GeminiSidebar: React.FC = () => {
    const { selectedModel, activeTabId, tabs } = useWorkspace() as any;
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "I am the CodeShield Neural Agent. How can I assist your development trace today?",
            timestamp: new Date(),
            type: 'text'
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const activeFile = tabs.find((t: any) => t.id === activeTabId);
            const context = activeFile ? `Active File: ${activeFile.name}\n\n${activeFile.content}` : '';

            const response = await fetch('/api/analyze-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: context || 'No file selected',
                    analysisType: 'chat',
                    modelId: selectedModel,
                    context: input.trim()
                })
            });

            const data = await response.json();
            
            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.explanation || data.message || "Neural link stable, but response was empty.",
                timestamp: new Date(),
                type: 'text'
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Neural disruption detected. Please retry transmission.",
                timestamp: new Date(),
                type: 'text'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const clearChat = () => {
        setMessages([messages[0]]);
    };

    return (
        <div className="h-full flex flex-col bg-[#050508] border-l border-white/5 font-exo overflow-hidden">
            {/* AGENT HEADER */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 bg-black/40 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(129,140,248,0.2)]">
                            <Sparkles size={16} className="text-indigo-400" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#050508] rounded-full animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Neural Agent</h2>
                        <div className="flex items-center gap-1.5 mt-0.5 opacity-40">
                             <Cpu size={8} />
                             <span className="text-[7px] font-black uppercase tracking-widest leading-none mt-0.5">{selectedModel}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={clearChat} className="p-2 text-white/20 hover:text-red-400 transition-all" title="Purge Context">
                        <Trash2 size={14} />
                    </button>
                    <button className="p-2 text-white/20 hover:text-white transition-all">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* CHAT AREA */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6"
            >
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div 
                            key={msg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] group ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                                <div className={`flex items-center gap-2 opacity-30 group-hover:opacity-60 transition-all ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                                    <span className="text-[8px] font-black uppercase tracking-widest">
                                        {msg.role === 'user' ? 'Operator' : 'Neural'}
                                    </span>
                                </div>
                                <div className={`p-4 rounded-3xl text-[11px] leading-relaxed shadow-lg border transition-all ${
                                    msg.role === 'user' 
                                        ? 'bg-indigo-600/10 border-indigo-500/20 text-white/90 rounded-tr-none' 
                                        : 'bg-white/[0.03] border-white/5 text-white/70 rounded-tl-none'
                                }`}>
                                    {msg.content}
                                </div>
                                <span className="text-[7px] font-mono text-white/10 mt-1 uppercase tracking-tighter">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                             <div className="flex gap-1">
                                 <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                 <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                 <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                             </div>
                             <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100/30">Synthesizing...</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* INPUT AREA */}
            <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-xl shrink-0">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
                    <div className="relative flex items-center bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                         <div className="pl-4 text-white/20"><MessageSquare size={14} /></div>
                         <input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Instruct Neural Agent..."
                            className="w-full bg-transparent p-4 text-[11px] text-white outline-none placeholder:text-white/10 placeholder:uppercase placeholder:tracking-widest font-medium"
                         />
                         <button 
                            onClick={handleSendMessage}
                            disabled={!input.trim() || isTyping}
                            className="p-4 text-white/20 hover:text-indigo-400 transition-all disabled:opacity-0"
                         >
                            {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                         </button>
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                    <div className="flex gap-2">
                        <button className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-white/30 hover:bg-white/10 hover:text-white transition-all">
                             <Wand2 size={10} />
                             Refactor
                        </button>
                        <button className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-white/30 hover:bg-white/10 hover:text-white transition-all">
                             <Code2 size={10} />
                             Debug
                        </button>
                    </div>
                    <span className="text-[7px] text-white/10 font-bold uppercase tracking-widest">Neural v9.1</span>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
            `}</style>
        </div>
    );
};

export default GeminiSidebar;
