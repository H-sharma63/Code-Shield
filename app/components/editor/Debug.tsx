import React from 'react';
import { useWorkspace } from './WorkspaceContext';
import { 
    Download, 
    Play, 
    ArrowRight, 
    ArrowDown, 
    Database, 
    Layers, 
    Terminal as TerminalIcon,
    X,
    Activity,
    Target
} from 'lucide-react';

interface DebugStep {
    line: number;
    function: string;
    file: string;
    variables: Record<string, any>;
    action: string;
}

interface DebugProps {
  analysis: {
    explanation: string;
    suggestions: string[];
  } | null;
  isAnalyzing: boolean;
  onDebug: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  activeFileContent: string;
  activeFileName: string;
}

const Debug = ({ analysis, isAnalyzing, onDebug, selectedModel, setSelectedModel, activeFileContent, activeFileName }: DebugProps) => {
    const { remoteDebugState, resumeDebug, stepDebug } = useWorkspace();
    const [debugMode, setDebugMode] = React.useState(false);
    const [isSimulating, setIsSimulating] = React.useState(false);
    const [simulationSteps, setSimulationSteps] = React.useState<DebugStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
    const [logs, setLogs] = React.useState<{time: string, msg: string, type: string, highlight?: boolean}[]>([]);

    // Use remote data if available, otherwise fallback to simulation
    const isActiveRemote = remoteDebugState.active;
    const currentCallStack = isActiveRemote ? remoteDebugState.callStack : simulationSteps.slice(Math.max(0, currentStepIndex - 2), currentStepIndex + 1);
    const currentVariables = isActiveRemote ? remoteDebugState.variables : simulationSteps[currentStepIndex]?.variables;

    const handleStartTrace = async () => {
        if (!activeFileContent) return;
        
        setIsSimulating(true);
        setDebugMode(true);
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Initiating trace for ${activeFileName}...`, type: 'info' }]);

        try {
            const res = await fetch('/api/debug/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: activeFileContent,
                    filename: activeFileName,
                    modelId: selectedModel
                })
            });
            const data = await res.json();
            
            if (data.steps && data.steps.length > 0) {
                setSimulationSteps(data.steps);
                setCurrentStepIndex(0);
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Execution blueprint generated.`, type: 'sys', highlight: true }]);
                
                let step = 0;
                const interval = setInterval(() => {
                    setCurrentStepIndex(prev => {
                        if (prev >= data.steps.length - 1) {
                            clearInterval(interval);
                            setIsSimulating(false);
                            return prev;
                        }
                        return prev + 1;
                    });
                }, 1500);

            } else {
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Simulation returned empty trace.', type: 'err' }]);
                setIsSimulating(false);
            }
        } catch (e) {
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Neural synthesis failed.', type: 'err' }]);
            setIsSimulating(false);
        }
    };

    return (
        <div className="h-full w-full grid grid-rows-[auto_1fr] bg-[#050508] text-white font-exo overflow-hidden relative">
            
            {/* PINNED HEADERS SECTION */}
            <div className="z-50 bg-[#050508] border-b border-white/5 shadow-2xl">
                <div className="px-5 py-4 flex items-center justify-between">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Neural Debugger</h2>
                    <div className={`p-1.5 rounded-md ${debugMode || isActiveRemote ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 text-white/20'}`}>
                        <Activity size={12} className={isActiveRemote ? 'animate-pulse' : ''} />
                    </div>
                </div>

                <div className="p-4 space-y-3 pb-6">
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-white/5 text-white/70 text-[10px] uppercase font-black tracking-widest rounded-lg p-3 outline-none border border-white/10 hover:border-white/20 transition-all cursor-pointer focus:border-red-500/40"
                    >
                        <option value="gemini-2.0-flash">Gemini 2.0 Pro</option>
                        <option value="mistral-codestral">Mistral Codestral</option>
                    </select>
                    
                    <button
                        onClick={handleStartTrace}
                        disabled={isSimulating || isActiveRemote}
                        className={`flex items-center justify-center gap-3 w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative z-10 ${debugMode || isActiveRemote ? 'bg-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.4)] hover:scale-[1.02] active:scale-[0.98]' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}
                    >
                        {isSimulating ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Play size={14} className="fill-white" />}
                        {isActiveRemote ? 'Remote Active' : (debugMode ? 'Restart Session' : 'Start Trace')}
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="overflow-y-auto custom-scrollbar p-4 space-y-6 pb-40 relative z-10">
                {!(debugMode || isActiveRemote) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 mt-12 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                        <Target size={32} className="text-white/10 mb-6" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 leading-relaxed">
                            Initialize Neural Trace or Remote Debugging to capture state.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Call Stack Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                                    {isActiveRemote ? 'Live Call Stack' : 'Active Call Stack'}
                                </h3>
                                <Layers size={12} className="text-white/20" />
                            </div>
                            <div className="space-y-2">
                                {currentCallStack.length > 0 ? (
                                    currentCallStack.map((step: any, i: number) => (
                                        <div key={i} className={`p-4 rounded-xl border transition-all ${i === (currentCallStack.length - 1) ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)] scale-[1.02]' : 'bg-white/[0.01] border-white/5 opacity-40'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[11px] font-black text-white leading-none">{isActiveRemote ? step.name : step.function}</p>
                                                <span className="text-[8px] font-mono text-white/30">L:{isActiveRemote ? step.location?.lineNumber : step.line}</span>
                                            </div>
                                            <p className="text-[9px] font-mono text-red-500/60 uppercase tracking-tighter">
                                                {isActiveRemote ? step.location?.scriptId : step.file}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 animate-pulse">
                                        <p className="text-[10px] text-white/20 uppercase font-black text-center">Waiting for events...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* State Observatory */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest">State Observatory</h3>
                                <Database size={12} className="text-white/20" />
                            </div>
                            <div className="space-y-2">
                                {currentVariables ? (
                                    Object.entries(currentVariables).map(([key, val], i) => (
                                        <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 border-l-2 border-l-red-500 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-red-500/[0.03] animate-pulse" />
                                            <div className="flex justify-between items-center mb-2 relative z-10">
                                                <span className="text-[10px] font-black text-white/50 lowercase">{key}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                                            </div>
                                            <p className="text-[11px] font-mono text-white/90 truncate relative z-10">
                                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-10 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                                        <span className="text-[9px] uppercase font-black text-white/10 tracking-[0.2em]">No scope detected</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Neural Console */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest">Neural Console</h3>
                                <TerminalIcon size={12} className="text-white/20" />
                            </div>
                            <div className="bg-black/40 rounded-2xl border border-white/5 p-4 font-mono text-[10px] space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {logs.map((log, i) => (
                                    <div key={i} className="flex gap-3 leading-relaxed">
                                        <span className="text-white/20 shrink-0">{log.time}</span>
                                        <span className={`${log.highlight ? 'text-red-500 font-bold' : log.type === 'err' ? 'text-red-400' : 'text-white/60'}`}>
                                            {log.msg}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Stepping Controls */}
            {(debugMode || isActiveRemote) && (
                <div className="absolute bottom-20 left-4 right-4 z-[60] animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex bg-[#121217]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.7)] justify-between">
                        <button onClick={() => resumeDebug()} title="Resume" className="p-3 text-white/40 hover:text-white transition-all"><Play size={18} /></button>
                        <button 
                            onClick={() => isActiveRemote ? stepDebug() : setCurrentStepIndex(p => Math.min(simulationSteps.length - 1, p + 1))}
                            title="Step Over" 
                            className="p-3 text-blue-400 hover:text-blue-300 transition-all"
                        >
                            <ArrowRight size={18} />
                        </button>
                        <button title="Step Into" className="p-3 text-purple-400 hover:text-purple-300 transition-all"><ArrowDown size={18} /></button>
                        <div className="w-[1px] bg-white/10 my-2 mx-1" />
                        <button onClick={() => { setDebugMode(false); setIsSimulating(false); }} title="Terminate" className="p-3 text-red-500 hover:text-white transition-all"><X size={18} /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Debug;