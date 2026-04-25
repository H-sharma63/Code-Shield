'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Play, 
    ArrowRight, 
    ArrowDown, 
    Square, 
    Activity, 
    Database, 
    Layers, 
    Zap, 
    Cpu, 
    Files,
    Terminal as TerminalIcon,
    Settings2,
    Target,
    X,
    Wand2,
    CheckCircle2,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace, DebugStep } from './WorkspaceContext';

interface VisualDebuggerProps {
  onApplyFix: (suggestion: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  activeFileContent: string;
  activeFileName: string;
}

export const VisualDebugger: React.FC<VisualDebuggerProps> = ({ 
    onApplyFix,
    selectedModel, 
    setSelectedModel, 
    activeFileContent, 
    activeFileName 
}) => {
    const { remoteDebugState, resumeDebug, stepDebug, debuggerState, setDebuggerState } = useWorkspace();
    
    // UI Local State
    const [showGuide, setShowGuide] = useState(false);
    const [activeRightTab, setActiveRightTab] = useState<'State' | 'Wisdom'>('State');
    const [applyingFixIdx, setApplyingFixIdx] = useState<number | null>(null);

    useEffect(() => {
        const hasSeenGuide = localStorage.getItem('codeshield-debugger-guide-seen');
        if (!hasSeenGuide) {
            setShowGuide(true);
        }
    }, []);

    const dismissGuide = () => {
        setShowGuide(false);
        localStorage.setItem('codeshield-debugger-guide-seen', 'true');
    };

    // Derived states from Persistent Workspace Context
    const { steps: simulationSteps, logs, analysis: localAnalysis, currentStepIndex, isSimulating } = debuggerState;
    const debugMode = simulationSteps.length > 0;

    // Use remote data if available, otherwise fallback to simulation
    const isActiveRemote = remoteDebugState.active;
    const currentCallStack = isActiveRemote ? remoteDebugState.callStack : simulationSteps.slice(Math.max(0, currentStepIndex - 2), currentStepIndex + 1);
    const currentVariables = isActiveRemote ? remoteDebugState.variables : simulationSteps[currentStepIndex]?.variables;
    const currentLine = isActiveRemote ? remoteDebugState.currentLine : simulationSteps[currentStepIndex]?.line;
    const currentFile = isActiveRemote ? remoteDebugState.currentFile : simulationSteps[currentStepIndex]?.file;

    const handleStartTrace = async () => {
        if (!activeFileContent) return;
        
        setDebuggerState({
            isSimulating: true,
            analysis: null,
            steps: [],
            logs: [{ time: new Date().toLocaleTimeString(), msg: `Initiating trace for ${activeFileName}...`, type: 'signal' }],
            currentStepIndex: 0
        });

        try {
            // 1. Kick off simulation
            const simulationPromise = fetch('/api/debug/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: activeFileContent,
                    filename: activeFileName,
                    modelId: selectedModel
                })
            }).then(res => res.json());

            // 2. Kick off analysis (Neural Wisdom)
            const analysisPromise = fetch('/api/analyze-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: activeFileContent,
                    analysisType: 'debug',
                    modelId: selectedModel
                })
            }).then(res => res.json());

            const [simData, analysisData] = await Promise.all([simulationPromise, analysisPromise]);
            
            if (simData.steps && simData.steps.length > 0) {
                setDebuggerState({
                    steps: simData.steps,
                    logs: [...logs, { time: new Date().toLocaleTimeString(), msg: `Execution blueprint generated.`, type: 'info', highlight: true }]
                });
                
                // Auto-play interval
                const interval = setInterval(() => {
                    setDebuggerState((prev: any) => {
                        const nextIdx = prev.currentStepIndex + 1;
                        if (nextIdx >= simData.steps.length) {
                             clearInterval(interval);
                             return { isSimulating: false };
                        }
                        return { currentStepIndex: nextIdx };
                    });
                }, 1500);

            } else {
                setDebuggerState({
                    logs: [...logs, { time: new Date().toLocaleTimeString(), msg: 'Simulation returned empty trace.', type: 'err' }],
                    isSimulating: false
                });
            }

            if (analysisData && analysisData.explanation) {
                setDebuggerState({
                    analysis: analysisData,
                    logs: [...logs, { time: new Date().toLocaleTimeString(), msg: `Neural Wisdom synthesis complete.`, type: 'success' }]
                });
            }

        } catch (e) {
            setDebuggerState({
                logs: [...logs, { time: new Date().toLocaleTimeString(), msg: 'Neural synthesis failed.', type: 'err' }],
                isSimulating: false
            });
        }
    };

    const handleApplyNeuralFix = async (suggestion: string, idx: number) => {
        setApplyingFixIdx(idx);
        await onApplyFix(suggestion);
        setApplyingFixIdx(null);
    };

    return (
        <div className="h-full w-full bg-[#050508] text-white font-exo overflow-hidden relative border-t border-white/5 shadow-[0_-20px_100px_rgba(0,0,0,0.8)]">
            
            {/* 1. FIXED HEADER */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl z-[60] absolute top-0 left-0 right-0">
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg border transition-all ${debugMode || isActiveRemote ? 'bg-red-500/20 border-red-500/30 animate-pulse' : 'bg-white/5 border-white/10'}`}>
                        <TerminalIcon size={16} className={debugMode || isActiveRemote ? 'text-red-500' : 'text-white/20'} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/90">Neural Debugger</h2>
                             {debugMode && <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[7px] text-indigo-400 font-bold uppercase tracking-widest">Persistent</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[7px] font-black uppercase text-white/20 tracking-widest">{selectedModel}</span>
                            {(debugMode || isActiveRemote) && <span className="text-red-500 text-[7px] font-black animate-pulse uppercase tracking-widest">• LIVE SESSION</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!debugMode && !isActiveRemote && (
                        <button 
                            onClick={handleStartTrace}
                            disabled={isSimulating || !activeFileContent}
                            className="group flex items-center bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            <Play size={14} className="mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Start Neural Trace</span>
                        </button>
                    )}
                    <button className="p-2 text-white/20 hover:text-white transition-all"><Settings2 size={16}/></button>
                </div>
            </div>

            {/* 2. MAIN CONTENT AREA (ABSOLUTE BELOW HEADER) */}
            <div className="absolute top-14 bottom-0 left-0 right-0 overflow-hidden flex">
                
                {/* LEFT: CALL STACK (FIXED) */}
                <div className="w-48 border-r border-white/5 bg-black/40 flex flex-col shrink-0">
                    <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between opacity-40">
                        <h3 className="text-[9px] font-black uppercase tracking-widest">Call Stack</h3>
                        <Layers size={12} />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {currentCallStack && (currentCallStack as any[]).length > 0 ? (
                            (currentCallStack as any[]).map((step, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ x: -10, opacity: 0 }} 
                                    animate={{ x: 0, opacity: 1 }}
                                    className={`p-3 rounded-lg border transition-all ${i === (currentCallStack as any[]).length - 1 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/[0.02] border-white/5 opacity-50'}`}
                                >
                                    <div className="text-[9px] font-black text-white/80 truncate">{isActiveRemote ? step.name : (step.function || 'anonymous')}</div>
                                    <div className="text-[7px] font-mono text-white/30 mt-1">line {isActiveRemote ? step.location?.lineNumber : step.line}</div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center opacity-10 italic text-[9px] text-center px-4">Neural Signal Pending...</div>
                        )}
                    </div>
                </div>

                {/* CENTER: EXECUTION STAGE */}
                <div className="flex-1 bg-[#050508] relative overflow-hidden flex flex-col min-w-0">
                    {!debugMode && !isActiveRemote ? (
                        <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center mb-8"><TerminalIcon size={40} className="text-white/10" /></div>
                            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-white/40 mb-4">Awaiting Signal</h3>
                            <p className="text-[10px] text-white/20 max-w-xs leading-relaxed uppercase tracking-widest font-black">Open a file and initiate trace for real-time neural mapping</p>
                            <button 
                                onClick={handleStartTrace}
                                disabled={!activeFileContent}
                                className="mt-8 px-8 py-3 bg-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-2xl active:scale-95 disabled:opacity-20"
                            >
                                Trigger Sequence
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-6 relative">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]" />
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)', backgroundSize: '30px 30px' }} />

                            <div className="w-full max-w-xl z-10">
                                <motion.div 
                                    key={currentLine}
                                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    className="p-10 rounded-[3rem] bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden group"
                                >
                                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                                    
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 text-[10px] font-black border border-red-500/20">
                                                    {currentStepIndex + 1}
                                                </span>
                                                <span className="text-[10px] font-mono text-white/40 italic">@{currentFile || 'unknown'}:{currentLine}</span>
                                            </div>
                                            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase text-white/40 tracking-widest">Execution Active</div>
                                        </div>
                                        <div className="py-2">
                                            <p className="text-lg font-mono text-white/90 leading-relaxed font-bold">
                                                {isActiveRemote ? 'Runtime execution paused by host.' : (simulationSteps[currentStepIndex]?.action || 'Tracing logic flow...')}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: STATE & WISDOM (ABSOLUTE PANEL) */}
                <div className="w-[450px] border-l border-white/5 bg-[#08080c] flex flex-col overflow-hidden shrink-0 relative">
                    {/* TABS */}
                    <div className="flex border-b border-white/5 bg-black/20 shrink-0 h-12">
                        {(['State', 'Wisdom'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveRightTab(tab)}
                                className={`flex-1 flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeRightTab === tab
                                        ? 'text-red-500 bg-red-500/5 shadow-[inset_0_-2px_0_#ef4444]' 
                                        : 'text-white/20 hover:text-white/40'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* SCROLLABLE PANEL AREA */}
                    <div className="absolute top-12 bottom-32 left-0 right-0 overflow-y-auto custom-scrollbar bg-black/10">
                        {activeRightTab === 'State' ? (
                            <div className="p-4 space-y-2">
                                <div className="p-1 flex items-center justify-between opacity-30">
                                    <h3 className="text-[8px] font-black uppercase tracking-widest text-white">State Observatory</h3>
                                    <Database size={10} className="text-white" />
                                </div>
                                {currentVariables && Object.keys(currentVariables).length > 0 ? (
                                    Object.entries(currentVariables).map(([key, val]) => (
                                        <div key={key} className="p-3 rounded-xl bg-white/[0.01] border border-white/5">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[9px] font-black text-red-400 font-mono tracking-tight">{key}</span>
                                                <span className="text-[7px] px-1 py-0.5 bg-white/5 text-white/20 rounded uppercase font-bold">{typeof val}</span>
                                            </div>
                                            <div className="text-[10px] font-mono text-white/60 break-all leading-relaxed whitespace-pre-wrap">
                                                {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center opacity-10 gap-2">
                                        <Database size={32} />
                                        <p className="text-[8px] font-black uppercase">No variables active</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-6 space-y-6 flex flex-col">
                                <div className="flex items-center justify-between opacity-30 pb-4">
                                    <div className="flex items-center gap-2">
                                         <Zap size={10} className="text-white" />
                                         <h3 className="text-[8px] font-black uppercase tracking-widest text-white">Neural Wisdom Analysis</h3>
                                    </div>
                                    <span className="text-[7px] px-1.5 py-0.5 bg-white/5 rounded border border-white/10 uppercase font-black text-white/40 tracking-widest">AI Synthesis</span>
                                </div>
                                {localAnalysis ? (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <h4 className="text-[9px] font-black uppercase text-red-500/80 tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-red-500" />
                                                Diagnostic Summary
                                            </h4>
                                            <div className="text-[11px] text-white/70 leading-relaxed font-medium bg-white/[0.02] p-5 rounded-3xl border border-white/5 shadow-inner">
                                                {localAnalysis.explanation}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-[9px] font-black uppercase text-purple-500/80 tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-purple-500" />
                                                Neural Fix Strategies
                                            </h4>
                                            <div className="space-y-3">
                                                {localAnalysis.suggestions.map((s: string, i: number) => (
                                                    <div key={i} className="group relative p-5 rounded-3xl bg-white/[0.01] border border-white/5 transition-all hover:bg-white/[0.03] hover:border-white/10">
                                                        <div className="flex gap-4 mb-4">
                                                            <span className="text-purple-500 font-mono font-black opacity-40 text-[10px]">0{i+1}</span>
                                                            <span className="text-[10px] text-white/50 leading-relaxed">{s}</span>
                                                        </div>
                                                        <button 
                                                            disabled={applyingFixIdx === i}
                                                            onClick={() => handleApplyNeuralFix(s, i)}
                                                            className={`w-full py-2.5 rounded-xl border flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-widest transition-all ${
                                                                applyingFixIdx === i 
                                                                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-400 animate-pulse' 
                                                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white hover:border-white/20'
                                                            }`}
                                                        >
                                                            {applyingFixIdx === i ? <Activity size={10} className="animate-spin" /> : <Wand2 size={10} />}
                                                            {applyingFixIdx === i ? 'Processing Fix...' : 'Apply Neural Fix'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-60 flex flex-col items-center justify-center opacity-20 italic">
                                        <Activity size={32} className="animate-pulse" />
                                        <p className="text-[10px] font-black uppercase mt-4">Awaiting AI Synthesis...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* LOGS PANEL */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 border-t border-white/5 bg-black/40 p-4 overflow-y-auto custom-scrollbar shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-2 mb-3 bg-black/10 pb-2 shrink-0">
                            <Activity size={10} className="text-white/30" />
                            <h4 className="text-[9px] font-black uppercase text-white/30 tracking-widest">Neural signal processing</h4>
                        </div>
                        <div className="space-y-1.5">
                            {logs.map((log: any, i: number) => (
                                <div key={i} className="text-[9px] font-mono flex items-start gap-2">
                                    <span className="opacity-10 shrink-0 text-[8px] mt-0.5">{log.time}</span>
                                    <span className={`${log.type === 'signal' ? 'text-red-400' : log.type === 'data' ? 'text-blue-400' : log.type === 'err' ? 'text-red-500' : 'text-white/30'} leading-relaxed`}>{log.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* STEPPING HUD */}
            <AnimatePresence>
                {(debugMode || isActiveRemote) && (
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="h-24 flex items-center justify-center pb-6 px-10 absolute bottom-0 left-0 right-0 z-[100] pointer-events-none">
                        <div className="px-6 py-2 bg-[#121217]/90 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto flex items-center gap-1 ring-1 ring-white/10 scale-90">
                            {[
                                { icon: Play, label: 'Resume', color: 'text-green-500', action: () => isActiveRemote ? resumeDebug() : setDebuggerState({ isSimulating: !isSimulating }) },
                                { icon: ArrowRight, label: 'Step Over', color: 'text-blue-500', action: () => isActiveRemote ? stepDebug() : setDebuggerState({ currentStepIndex: Math.min(simulationSteps.length - 1, currentStepIndex + 1) }) },
                                { icon: X, label: 'Stop', color: 'text-red-500', action: () => { setDebuggerState({ steps: [], isSimulating: false, currentStepIndex: 0 }); } },
                            ].map((ctrl, i) => (
                                <React.Fragment key={ctrl.label}>
                                    <button onClick={ctrl.action} className="group relative flex flex-col items-center gap-1 p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-95">
                                        <ctrl.icon size={18} className={`${ctrl.color} transition-all group-hover:scale-110 drop-shadow-[0_0_8px_currentColor]`} />
                                        <span className="text-[7px] font-black uppercase tracking-tighter text-white/20 group-hover:text-white/40">{ctrl.label}</span>
                                    </button>
                                    {i < 2 && <div className="w-[1px] h-6 bg-white/5 mx-1" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ONBOARDING GUIDE */}
            <AnimatePresence>
                {showGuide && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="max-w-md w-full bg-[#121217] border border-white/10 rounded-[2rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500" />
                            <div className="space-y-8">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]"><Zap size={32} className="text-red-500" /></div>
                                    <div><h2 className="text-xl font-black uppercase tracking-widest text-white">Neural Onboarding</h2><p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-2">Initialize Trace Sequence</p></div>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { icon: Files, title: 'I. Select Source', desc: 'Open any code file from the Explorer to prepare the neural engine.' },
                                        { icon: Play, title: 'II. Start Trace', desc: 'Click Start Trace to begin an AI-driven dry-run of your code.' },
                                        { icon: Target, title: 'III. Live Debug', desc: 'Set breakpoints in the editor to sync with remote server processes.' },
                                    ].map((step, i) => (
                                        <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                            <div className="mt-1 p-2 rounded-lg bg-white/5 text-white/40"><step.icon size={16} /></div>
                                            <div><h4 className="text-[10px] font-black uppercase tracking-widest text-white/80">{step.title}</h4><p className="text-[10px] text-white/40 mt-1 leading-relaxed">{step.desc}</p></div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={dismissGuide} className="w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">Dismiss Signal</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                @font-face { font-family: 'Exo'; src: url('https://fonts.googleapis.com/css2?family=Exo:wght@400;900&display=swap'); }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.5); }
            `}</style>
        </div>
    );
};

export default VisualDebugger;
