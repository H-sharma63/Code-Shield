'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { X, ZoomIn, ZoomOut, Maximize2, Search, Activity, Code2, GitMerge, Layers, Cpu } from 'lucide-react';

interface NeuralFlowProps {
    repoFullName: string;
    onNotify: (msg: string, type: 'success' | 'error') => void;
    onClose: () => void;
}

const NeuralFlow: React.FC<NeuralFlowProps> = ({ repoFullName, onNotify, onClose }) => {
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const fgRef = useRef<any>(null);

    useEffect(() => {
        const loadGraph = async () => {
            try {
                const response = await fetch('/api/architecture/flow');
                if (!response.ok) throw new Error("Graph data not found");
                const data = await response.json();

                // Transform data for react-force-graph
                const nodes = data.nodes.map((n: any) => ({
                    ...n,
                    name: n.label,
                    val: n.file_type === 'code' ? 5 : 2,
                    color: n.label.includes('()') ? '#10b981' : n.label.includes('.') ? '#3b82f6' : '#8b5cf6'
                }));

                const links = data.links.map((l: any) => ({
                    source: l.source,
                    target: l.target,
                    relation: l.relation,
                    value: l.weight || 1
                }));

                setGraphData({ nodes, links });
                onNotify("Neural flow engine initialized.", "success");
            } catch (err) {
                console.error(err);
                onNotify("Failed to load neural flow data.", "error");
            } finally {
                setLoading(false);
            }
        };

        loadGraph();
    }, [repoFullName, onNotify]);

    const filteredData = useMemo(() => {
        if (!searchQuery) return graphData;
        const lowerQuery = searchQuery.toLowerCase();
        const matchedNodes = graphData.nodes.filter(n => 
            n.label.toLowerCase().includes(lowerQuery) || 
            n.source_file?.toLowerCase().includes(lowerQuery)
        );
        const nodeIds = new Set(matchedNodes.map(n => n.id));
        const matchedLinks = graphData.links.filter(l => 
            nodeIds.has(typeof l.source === 'object' ? l.source.id : l.source) || 
            nodeIds.has(typeof l.target === 'object' ? l.target.id : l.target)
        );
        return { nodes: matchedNodes, links: matchedLinks };
    }, [graphData, searchQuery]);

    return (
        <div className="h-full w-full bg-[#050507] relative overflow-hidden font-exo select-none flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-8 py-6 pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl shadow-2xl backdrop-blur-md">
                        <Cpu size={20} className="text-indigo-400 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">System Data Flow</h2>
                        <p className="text-[9px] font-mono text-indigo-400/50 uppercase tracking-widest mt-0.5">Live Neural Mapping</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors" size={14} />
                        <input 
                            type="text"
                            placeholder="Trace Logic..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[10px] text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500/50 focus:bg-black/60 transition-all w-48"
                        />
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2.5 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all rounded-xl border border-white/10"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/40">Syncing Logic Nodes...</span>
                    </div>
                ) : (
                    <ForceGraph2D
                        ref={fgRef}
                        graphData={filteredData}
                        nodeLabel="label"
                        nodeColor={n => n.color}
                        nodeRelSize={6}
                        linkDirectionalParticles={l => l.relation === 'calls' ? 4 : 0}
                        linkDirectionalParticleSpeed={0.01}
                        linkDirectionalParticleWidth={2}
                        linkDirectionalParticleColor={() => '#818cf8'}
                        linkColor={() => '#ffffff11'}
                        linkWidth={l => l.relation === 'calls' ? 1.5 : 0.5}
                        backgroundColor="#050507"
                        onNodeClick={node => {
                            setSelectedNode(node);
                            fgRef.current.centerAt(node.x, node.y, 1000);
                            fgRef.current.zoom(2, 1000);
                        }}
                        nodeCanvasObject={(node: any, ctx, globalScale) => {
                            const label = node.label;
                            const fontSize = 12 / globalScale;
                            ctx.font = `${fontSize}px Exo`;
                            const textWidth = ctx.measureText(label).width;
                            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = node.color;
                            ctx.fillText(label, node.x, node.y);

                            node.__bckgDimensions = bckgDimensions;
                        }}
                    />
                )}
            </div>

            {/* Legend & Details */}
            <div className="absolute bottom-8 left-8 right-8 z-30 flex items-end justify-between pointer-events-none">
                <div className="flex gap-6 p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl pointer-events-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Files</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Functions</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Data Flow</span>
                    </div>
                </div>

                {selectedNode && (
                    <div className="w-80 p-6 bg-[#0d1117]/95 backdrop-blur-2xl border border-indigo-500/40 rounded-3xl shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
                        <button onClick={() => setSelectedNode(null)} className="absolute top-4 right-4 text-white/20 hover:text-white transition-all">
                            <X size={14} />
                        </button>
                        
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={12} className="text-indigo-400" />
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em]">Logic Probe</span>
                        </div>

                        <h3 className="text-lg font-black text-white truncate font-exo mb-1">{selectedNode.label}</h3>
                        <p className="text-[10px] font-mono text-white/30 truncate mb-4">{selectedNode.source_file}</p>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Community</span>
                                <span className="text-[10px] font-mono text-indigo-400">#{selectedNode.community}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Dependencies</span>
                                <span className="text-[10px] font-mono text-indigo-400">{graphData.links.filter(l => l.target === selectedNode.id || l.source === selectedNode.id).length}</span>
                            </div>
                        </div>

                        <button 
                            className="w-full mt-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            Deep Context Inspection
                        </button>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .force-graph-container canvas {
                    cursor: crosshair !important;
                }
            `}</style>
        </div>
    );
};

export default NeuralFlow;
