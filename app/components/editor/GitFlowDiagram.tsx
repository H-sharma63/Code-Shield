'use client';

import React, { useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Panel,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 220;
const nodeHeight = 120;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 150 });

  // 1. Group the nodes by category
  const categories: Record<string, any[]> = {};
  nodes.forEach(node => {
    const cat = node.data.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(node);
  });

  const finalNodes: any[] = [];
  const finalEdges: any[] = [...edges];

  let currentY = 0;
  
  Object.entries(categories).forEach(([category, catNodes], catIdx) => {
    const groupId = `group-${category.replace(/\s+/g, '-').toLowerCase()}`;
    
    // Calculate group dimensions
    const cols = 3;
    const rows = Math.ceil(catNodes.length / cols);
    const groupWidth = Math.min(catNodes.length, cols) * (nodeWidth + 60) + 60;
    const groupHeight = rows * (nodeHeight + 80) + 120;

    // Add group node
    finalNodes.push({
      id: groupId,
      type: 'group',
      data: { label: category },
      position: { x: 0, y: currentY },
      style: { width: groupWidth, height: groupHeight, zIndex: -1 },
    });

    // Add modules as children
    catNodes.forEach((node, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        
        finalNodes.push({
            ...node,
            parentNode: groupId,
            extent: 'parent',
            position: { 
                x: 60 + col * (nodeWidth + 60), 
                y: 80 + row * (nodeHeight + 80) 
            },
            zIndex: 1
        });
    });

    currentY += groupHeight + 100;
  });

  // Re-map edges to ensure they connect correctly
  // (In a grouped view, we still connect the modules directly)

  return { nodes: finalNodes, edges: finalEdges };
};

const nodeTypes = {
    group: ({ data }: any) => (
        <div className="w-full h-full rounded-[2.5rem] bg-white/[0.02] border border-white/10 relative">
            <div className="absolute -top-4 left-8 px-5 py-2 bg-[#0d1117] border border-white/10 rounded-full shadow-2xl">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">{data.label}</span>
            </div>
        </div>
    ),
    module: ({ data }: any) => (
        <div className="px-6 py-5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] rounded-[1.5rem] bg-[#16161e] border border-white/10 min-w-[220px] group transition-all hover:border-indigo-500 hover:shadow-indigo-500/20">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl text-xl group-hover:scale-110 transition-transform shadow-inner">{data.label.split(' ')[0] || '⚙️'}</div>
                <div className="flex flex-col">
                    <span className="text-[14px] font-black text-white uppercase tracking-wider">{data.label.split(' ').slice(1).join(' ').split('[')[0]}</span>
                    <span className="text-[10px] font-mono text-indigo-400/50 font-bold">{data.label.match(/\[(.*?)\]/)?.[1] || ''}</span>
                </div>
            </div>
            {data.internal_functions && data.internal_functions.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-white/5 pt-4">
                    {data.internal_functions.slice(0, 3).map((f: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-[10px] font-mono text-white/30 group-hover:text-white/60 transition-colors">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                            {f}
                        </div>
                    ))}
                </div>
            )}
            <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-[#16161e] !border-2 !border-indigo-500 !-top-2" />
            <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-[#16161e] !border-2 !border-indigo-500 !-bottom-2" />
        </div>
    )
};

interface GitFlowDiagramProps {
    nodes: any[];
    edges: any[];
    onNodeClick?: (node: any) => void;
}

const GitFlowDiagram: React.FC<GitFlowDiagramProps> = ({ nodes, edges, onNodeClick }) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
        console.log(`[GitFlow] Rendering ${nodes.length} nodes and ${edges.length} edges`);
        
        const initialNodes = nodes.map(n => ({
            id: n.id,
            type: 'module',
            data: { ...n },
            position: { x: 0, y: 0 },
        }));

        const initialEdges = edges.map((e, i) => ({
            id: `e-${i}`,
            source: e.source,
            target: e.target,
            label: e.label,
            type: 'smoothstep',
            animated: true,
            zIndex: 100,
            style: { 
                stroke: '#818cf8', 
                strokeWidth: 4, 
                opacity: 1,
                filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.5))'
            },
            labelStyle: { fill: '#ffffff', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' as any, letterSpacing: '0.1em' },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#818cf8',
                width: 25,
                height: 25,
            },
        }));

        return getLayoutedElements(initialNodes, initialEdges);
    }, [nodes, edges]);

    return (
        <div className="w-full h-full bg-[#050507]">
            <ReactFlow
                nodes={layoutedNodes}
                edges={layoutedEdges}
                onNodeClick={(_, node) => onNodeClick?.(node.data)}
                nodeTypes={nodeTypes}
                onInit={(instance) => setTimeout(() => instance.fitView(), 200)}
                fitView
                className="bg-[#050507]"
            >
                <Background color="#ffffff03" gap={40} variant={'dots' as any} />
                <Controls 
                  showInteractive={false}
                  className="!bg-[#13131a] !border-white/10 !fill-white/30 hidden" 
                />
                <MiniMap 
                  maskColor="rgba(0,0,0,0.8)"
                  nodeColor="#1e293b"
                  className="!bg-[#0a0a0c] !border-white/10 rounded-xl"
                  style={{ bottom: 20, right: 20 }}
                />
            </ReactFlow>
        </div>
    );
};

export default GitFlowDiagram;
