'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
import { Layers, RefreshCw, ZoomIn, ZoomOut, Maximize2, Terminal, X, Search, Activity, Code2, GitMerge } from 'lucide-react';

interface ArchitectureMapProps {
    repoFullName: string | null;
    onNotify: (msg: string, type: 'success' | 'error') => void;
}

interface NodeData {
    id: string;
    label: string;
    category: string;
    shape: string;
    internal_functions?: string[];
}

const ArchitectureMap: React.FC<ArchitectureMapProps> = ({ repoFullName, onNotify }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mermaidRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<string>("");
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 0.8 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [selectedModule, setSelectedModule] = useState<NodeData | null>(null);
    const [isDebugMode, setIsDebugMode] = useState(false);

    const fetchMapData = useCallback(async () => {
        if (!repoFullName) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/github/architecture?repo=${encodeURIComponent(repoFullName)}`);
            const data = await res.json();

            if (res.ok && data.mermaid) {
                setSummary(data.summary);
                setNodes(data.nodes || []);
                
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'base',
                    securityLevel: 'loose',
                    flowchart: { 
                        defaultRenderer: 'elk', 
                        curve: 'linear', 
                        nodeSpacing: 120, 
                        rankSpacing: 180,
                        padding: 50
                    },
                    themeVariables: {
                        primaryColor: isDebugMode ? '#ef4444' : '#1e293b',
                        primaryBorderColor: isDebugMode ? '#ef4444' : '#3178c6',
                        primaryTextColor: '#fff',
                        lineColor: isDebugMode ? '#ef444488' : '#3178c688',
                        mainBkg: '#0d1117',
                        clusterBkg: isDebugMode ? '#1a0d0d' : '#111827',
                        clusterBorder: isDebugMode ? '#ef444422' : '#3178c644'
                    }
                });

                if (mermaidRef.current) {
                    mermaidRef.current.innerHTML = '';
                    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
                    const { svg } = await mermaid.render(id, data.mermaid);
                    mermaidRef.current.innerHTML = svg;
                    onNotify("Project blueprint synchronized via AI Engine.", "success");
                }
            }
        } catch (err) {
            onNotify("Neural engine failure.", "error");
        } finally {
            setLoading(false);
        }
    }, [repoFullName, onNotify, isDebugMode]);

    useEffect(() => {
        fetchMapData();
    }, [fetchMapData]);

    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            const node = (e.target as HTMLElement).closest('.node');
            if (node) {
                const id = node.id.replace(/^mermaid-/, '').replace(/-\d+$/, '');
                // Try to find by ID first, then by Label
                const label = node.querySelector('.nodeLabel')?.textContent;
                const foundNode = nodes.find(n => n.id.replace(/[^a-zA-Z0-9]/g, '_') === id) || nodes.find(n => n.label === label);
                if (foundNode) setSelectedModule(foundNode);
            }
        };
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, [nodes]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setViewState(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? 0.92 : 1.08;
        setViewState(prev => ({ 
            ...prev, 
            scale: Math.max(0.05, Math.min(5, prev.scale * delta)) 
        }));
    };

    return (
        <div className={`h-full w-full relative overflow-hidden font-exo select-none transition-colors duration-1000 ${isDebugMode ? 'bg-[#0a0505]' : 'bg-[#050507]'}`}>
            {/* HUD Top: Title & Tools */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-10 py-8 pointer-events-none">
                <div className="flex items-center gap-5 pointer-events-auto">
                    <div className={`p-4 border rounded-2xl shadow-2xl backdrop-blur-md transition-all duration-500 ${isDebugMode ? 'bg-red-500/10 border-red-500/30 shadow-red-500/20' : 'bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/20'}`}>
                        <Layers size={24} className={isDebugMode ? 'text-red-500' : 'text-indigo-400'} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-widest text-white drop-shadow-lg font-exo">
                            {isDebugMode ? 'Neural Debugger' : 'Neural Architecture'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${isDebugMode ? 'bg-red-500 shadow-red-500' : 'bg-indigo-500 shadow-indigo-500'}`} />
                            <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.2em]">{repoFullName || 'scanning...'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pointer-events-auto">
                   <div className="flex bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden p-1.5 shadow-2xl">
                        <button 
                            onClick={() => setIsDebugMode(!isDebugMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isDebugMode ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'hover:bg-white/5 text-white/40'}`}
                        >
                            <Terminal size={14} />
                            {isDebugMode ? 'Debugger Active' : 'Neural Debug'}
                        </button>
                        <div className="w-[1px] bg-white/10 mx-2 my-2" />
                        <button onClick={() => setViewState(p => ({ ...p, scale: p.scale * 1.2 }))} className="p-2.5 hover:bg-white/5 text-white/50 hover:text-white transition-all rounded-lg">
                            <ZoomIn size={18} />
                        </button>
                        <button onClick={() => setViewState(p => ({ ...p, scale: p.scale * 0.8 }))} className="p-2.5 hover:bg-white/5 text-white/50 hover:text-white transition-all rounded-lg">
                            <ZoomOut size={18} />
                        </button>
                    </div>
                    <button 
                        onClick={() => {
                            const blob = new Blob([`# ARCHITECTURAL BLUEPRINT: ${repoFullName}\n\n${summary}`], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'ARCHITECTURAL_BLUEPRINT.md';
                            a.click();
                        }}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all rounded-2xl border border-white/10"
                        title="Generate Documentation (.md)"
                    >
                        <Activity size={18} />
                    </button>
                    <button 
                        onClick={fetchMapData}
                        disabled={loading}
                        className={`group flex items-center gap-3 px-8 py-3.5 rounded-2xl font-black text-xs tracking-widest uppercase hover:scale-[1.03] active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50 ${isDebugMode ? 'bg-red-600 text-white shadow-red-500/20' : 'bg-indigo-500 text-white shadow-indigo-500/20'}`}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                        Rebuild Graph
                    </button>
                </div>
            </div>

            {/* Interaction Stage */}
            <div 
                ref={containerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center transition-all duration-300"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                <div 
                    ref={mermaidRef}
                    className={`mermaid transition-transform duration-100 ease-out will-change-transform ${isDebugMode ? 'debug-active' : ''}`}
                    style={{ 
                        transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
                        transformOrigin: 'center center'
                    }}
                />
            </div>

            {/* HUD: Module Selection (DRILLDOWN) */}
            {selectedModule && (
                <div className="absolute bottom-10 right-10 z-40 w-[400px] pointer-events-auto animate-in slide-in-from-right duration-500">
                    <div className="p-8 rounded-[2rem] bg-[#0d1117]/95 backdrop-blur-2xl border border-indigo-500/40 shadow-[0_0_60px_rgba(129,140,248,0.2)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0" />
                        
                        <button onClick={() => setSelectedModule(null)} className="absolute top-6 right-6 text-white/30 hover:text-white transition-all p-1 hover:bg-white/5 rounded-full">
                            <X size={20} />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <Code2 size={14} className="text-indigo-400" />
                            <h4 className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.3em]">Module Drill-down</h4>
                        </div>

                        <div className="mb-6">
                            <p className="text-xl font-black text-white leading-tight break-all font-exo">{selectedModule.label}</p>
                            <span className="inline-block mt-2 px-2.5 py-1 bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase rounded-md border border-indigo-500/20 tracking-widest">{selectedModule.category}</span>
                        </div>

                        <div className="space-y-6">
                            {/* Function Mapping Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 opacity-30">
                                     <GitMerge size={12} className="text-white" />
                                     <h5 className="text-[8px] font-black uppercase tracking-[0.2em] text-white">Logic Junctions</h5>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {(selectedModule.internal_functions || ["Entry Logic", "Data Serializer", "Export Handler"]).map((func, idx) => (
                                        <div key={idx} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-all">
                                            <span className="text-[10px] font-mono text-white/70">{func}</span>
                                            <span className="text-[7px] font-black uppercase text-white/20 group-hover:text-indigo-400 transition-all tracking-tighter cursor-pointer">Deep Dive</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isDebugMode && (
                                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Neural Stream</p>
                                    </div>
                                    <p className="text-[11px] text-red-100/60 font-mono italic leading-relaxed">
                                        "Node participating in multi-file context exchange. Flow observed: {selectedModule.label} → [Project Core]"
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest text-white/30 px-2 mt-4">
                                <div className={`w-1.5 h-1.5 rounded-full ${isDebugMode ? 'bg-red-500' : 'bg-indigo-500'}`} />
                                <span>Multi-File Blueprint Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @font-face { font-family: 'Exo'; src: url('https://fonts.googleapis.com/css2?family=Exo:wght@400;900&display=swap'); }
                .mermaid svg {
                    max-width: none !important;
                    height: auto !important;
                }
                .mermaid .cluster rect {
                    fill: #111827 !important;
                    stroke: #818cf844 !important;
                    stroke-dasharray: 4 !important;
                    stroke-width: 2px !important;
                    rx: 16;
                    ry: 16;
                }
                .mermaid .cluster .label {
                    font-size: 20px !important;
                    font-weight: 900 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.4em !important;
                    fill: #818cf8 !important;
                    transform: translateY(-15px);
                }
                .mermaid .edgePath path {
                    stroke: #818cf8aa !important;
                    stroke-width: 3px !important;
                }
                .mermaid .edgePath:hover path {
                    stroke: #818cf8 !important;
                    stroke-width: 5px !important;
                }
                .mermaid .edgeLabel {
                    background-color: #818cf8 !important;
                    color: #ffffff !important;
                    font-size: 13px !important;
                    font-weight: 800 !important;
                    padding: 4px 10px !important;
                    border-radius: 6px !important;
                }
                .mermaid .node rect, .mermaid .node polygon, .mermaid .node circle, .mermaid .node path {
                    stroke-width: 3px !important;
                    transition: all 0.2s ease !important;
                    fill: #1a1a24 !important;
                }
                .mermaid .nodeLabel {
                    color: #fff !important;
                    font-family: 'Exo', sans-serif !important;
                    font-weight: 900 !important;
                    font-size: 15px !important;
                }
                
                .mermaid.debug-active .edgePath path {
                    stroke-dasharray: 10,5;
                    animation: dataFlow 15s linear infinite;
                    stroke: #ef4444aa !important;
                }
                .mermaid.debug-active .node:hover rect {
                    fill: #ef444422 !important;
                    stroke: #ef4444 !important;
                }
                
                @keyframes dataFlow {
                    from { stroke-dashoffset: 500; }
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
        </div>
    );
};

export default ArchitectureMap;
