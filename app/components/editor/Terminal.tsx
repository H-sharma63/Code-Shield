'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspace, Diagnostic } from './WorkspaceContext';
import { Plus, X, Terminal as TerminalIcon, Download, Maximize2, Minimize2, Minus, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import ProgressBar from './ProgressBar';
import 'xterm/css/xterm.css';

interface TerminalProps {
  projectId?: string | null;
  fileToSync?: { path: string; content: string } | null;
  onClose?: () => void;
  isMaximized?: boolean;
  onMaximizeToggle?: () => void;
  problems?: Diagnostic[];
  onProblemClick?: (path: string, line: number) => void;
}

const Terminal = ({ projectId, fileToSync, onClose, isMaximized, onMaximizeToggle, problems = [], onProblemClick }: TerminalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { 
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    closeSession,
    bootStatus,
    error,
    syncProject,
    persistFile,
    isTerminalBusy,
    syncProgress,
    syncStatus,
    mountTerminal,
    diagnostics
  } = useWorkspace();
  const [activeTab, setActiveTab] = React.useState<'terminal' | 'problems'>('terminal');

  const lastSyncedId = useRef<string | null>(null);

  // 1. Mount the Active Terminal
  useEffect(() => {
    if (terminalRef.current && activeSessionId && bootStatus === 'ready') {
        // Clear container before mounting new session
        terminalRef.current.innerHTML = '';
        mountTerminal(activeSessionId, terminalRef.current);
        
        // 🚀 RESPONSIVE FIT: Force a fit after mount
        setTimeout(() => {
          const session = sessions.find((s: any) => s.id === activeSessionId);
          if (session) {
            try { session.fitAddon.fit(); } catch (e) {}
          }
        }, 100);
    }
  }, [activeSessionId, bootStatus, mountTerminal, sessions]);

  // 2. Project Sync Logic (Wait for files before shell is ready)
  useEffect(() => {
    if (projectId && bootStatus === 'ready' && lastSyncedId.current !== projectId) {
      const sync = async () => {
          lastSyncedId.current = projectId;
          try {
              await syncProject(projectId);
          } catch (e) {
              console.error("Terminal sync failed", e);
          }
      };
      sync();
    }
  }, [projectId, bootStatus, syncProject]);

  // 3. File Live Sync REMOVED in favor of Manual Save (Ctrl+S) 
  // (Prevents terminal from seeing uncommitted memory changes)

  // 4. Handle Resize
  useEffect(() => {
      const handleResize = () => {
          const activeSession = sessions.find((s: any) => s.id === activeSessionId);
          if (!activeSession) return;
          try {
              // 🚀 ATOMIC SYNC: Multiple fits ensure the PTY and DOM are perfectly aligned
              activeSession.fitAddon.fit();
          } catch (e) {}
      };

      let resizeTimeout: NodeJS.Timeout;
      const resizeObserver = new ResizeObserver(() => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(handleResize, 50);
      });
      if (terminalRef.current) resizeObserver.observe(terminalRef.current);
      window.addEventListener('resize', handleResize);

      return () => {
          window.removeEventListener('resize', handleResize);
          resizeObserver.disconnect();
      };
  }, [activeSessionId, sessions]);

  const handleExportOutput = () => {
    const activeSession = sessions.find((s: any) => s.id === activeSessionId);
    if (!activeSession) return;

    // 1. Get terminal buffer content
    const term = activeSession.terminal;
    term.selectAll();
    const content = term.getSelection();
    term.clearSelection();

    if (!content) return;

    // 2. Browser Download (System Disk)
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-output-${new Date().getTime()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeSession = sessions.find((s: any) => s.id === activeSessionId);
  const isTerminalReady = bootStatus === 'ready' && activeSession?.hasOutput;

  return (
    <div className="h-full w-full bg-[#0a0a0c] rounded-none border-t border-white/[0.05] flex flex-col font-mono text-sm relative shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.5)] z-10">
      {/* Terminal Header with Tabs */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.05] bg-[#0a0a0c]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {sessions.filter((s: any) => !s.isAgent).map((session: any) => (
            <div 
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all duration-200 group min-w-[120px] max-w-[200px] border ${
                activeSessionId === session.id 
                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' 
                : 'bg-transparent border-transparent text-white/40 hover:bg-white/5 hover:text-white/60'
              }`}
            >
              <TerminalIcon size={12} className={activeSessionId === session.id ? 'text-indigo-400' : 'text-white/20'} />
              <span className="text-[10px] font-bold truncate uppercase tracking-wider">{session.name}</span>
              {sessions.filter((s: any) => !s.isAgent).length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); closeSession(session.id); }}
                  className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={createSession}
            className="p-1.5 ml-1 text-white/30 hover:text-white hover:bg-white/5 rounded-md transition-all"
            title="New Terminal"
          >
            <Plus size={16} />
          </button>

          <div className="flex items-center gap-1 ml-4 border-l border-white/10 pl-4">
              <button 
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === 'terminal' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-white/30 hover:text-white/60'
                }`}
              >
                Terminal
              </button>
              <button 
                onClick={() => setActiveTab('problems')}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                    activeTab === 'problems' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-white/30 hover:text-white/60'
                }`}
              >
                Problems
                {diagnostics.length > 0 && (
                    <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                        {diagnostics.length}
                    </span>
                )}
              </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 select-none">
            <div className="hidden sm:flex items-center gap-4 text-[9px] text-white/20 font-bold tracking-wider mr-4">
                <button 
                    onClick={handleExportOutput}
                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 hover:text-white/60 transition-all text-indigo-400/60"
                    title="Export Output to Disk"
                >
                    <Download size={12} />
                    <span className="uppercase tracking-widest">Download Log</span>
                </button>
                <span className="flex items-center gap-2 uppercase"><div className={`w-1 h-1 rounded-full ${bootStatus === 'ready' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'bg-red-500'}`}></div> {bootStatus}</span>
            </div>
            
            <div className="flex items-center gap-1 border-l border-white/10 pl-3">
                <button 
                    onClick={() => {
                        if (onMaximizeToggle) onMaximizeToggle();
                        // 🚀 MULTI-STAGE FIT: Ensure browser has finished layout before fitting
                        const runFit = () => {
                            const activeSession = sessions.find((s: any) => s.id === activeSessionId);
                            if (activeSession) {
                                try { activeSession.fitAddon.fit(); } catch (e) {}
                            }
                        };
                        setTimeout(runFit, 50);
                        setTimeout(runFit, 150);
                        setTimeout(runFit, 400);
                    }}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-md transition-all"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                    {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button 
                    onClick={onClose}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-md transition-all"
                    title="Minimize"
                >
                    <Minus size={16} />
                </button>
            </div>
        </div>
      </div>

      {bootStatus === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0c] text-red-400 gap-4 p-8 text-center animate-in fade-in duration-500">
            <X size={48} className="text-red-500/50" />
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Fatal Boot Error</span>
                <p className="text-xs text-white/40 font-mono max-w-md">{error || 'An unexpected error occurred during ignition.'}</p>
            </div>
            <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            >
                Retry Boot
            </button>
            <button 
                onClick={async () => { 
                    if (confirm("This will permanently delete your local workspace snapshot and start fresh. Continue?")) {
                        const root = await navigator.storage.getDirectory();
                        const entries = (dir: any) => dir.entries();
                        for await (const [name] of entries(root)) {
                            await root.removeEntry(name, { recursive: true });
                        }
                        window.location.reload();
                    }
                }}
                className="text-[9px] text-white/20 hover:text-red-400/60 font-bold uppercase tracking-widest underline underline-offset-4"
            >
                Reset System Disk (Wipe Data)
            </button>
        </div>
      )}

      {isTerminalBusy && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0c]/80 backdrop-blur-sm text-white/50 gap-3">
            <ProgressBar progress={syncProgress} status={syncStatus} />
        </div>
      )}

      {bootStatus === 'booting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0c] text-white/20 gap-3 animate-pulse z-50">
            <TerminalIcon size={40} strokeWidth={1} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Connecting to CodeShield Engine...</span>
        </div>
      )}

      {bootStatus === 'ready' && !activeSession?.hasOutput && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0c] text-white/20 gap-3 animate-pulse">
            <TerminalIcon size={40} strokeWidth={1} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Connecting SSH to CodeShield Engine...</span>
        </div>
      )}
      
      {/* --- TERMINAL TAB --- */}
      <div className={`flex-1 w-full relative min-h-0 z-10 ${activeTab !== 'terminal' || bootStatus !== 'ready' ? 'hidden' : 'block'}`}>
          <div 
              ref={terminalRef}
              className="absolute inset-0 bg-[#0a0a0c] overflow-hidden terminal-container"
          />
      </div>

      {/* --- PROBLEMS TAB --- */}
      <div className={`flex-1 w-full bg-[#0a0a0c] overflow-y-auto p-4 custom-scrollbar ${activeTab !== 'problems' ? 'hidden' : 'block'}`}>
            {diagnostics.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/10 gap-2">
                    <ShieldCheck size={48} strokeWidth={1} />
                    <span className="text-xs uppercase tracking-[0.2em] font-bold">No problems detected</span>
                </div>
            ) : (
                <div className="flex flex-col gap-1">
                    {diagnostics.map((diag, idx) => (
                        <div 
                            key={diag.id || idx} 
                            onClick={() => onProblemClick?.(diag.filePath, diag.line)}
                            className="flex items-start gap-3 p-2 hover:bg-white/5 rounded-md group transition-all border border-transparent hover:border-white/10 cursor-pointer"
                        >
                            <div className="mt-1">
                                {diag.severity === 'error' && <X size={14} className="text-red-500" />}
                                {diag.severity === 'warning' && <AlertCircle size={14} className="text-amber-500" />}
                                {diag.severity === 'info' && <Info size={14} className="text-blue-500" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-white/80 font-medium">{diag.message}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-white/40 hover:text-indigo-400 underline underline-offset-2 transition-all">{diag.filePath}:{diag.line}</span>
                                    <span className="text-[10px] text-white/20 uppercase tracking-widest">[{diag.source}]</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      <div className="h-2.5 bg-[#0a0a0c] shrink-0 w-full" />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .terminal-container .xterm-viewport {
          background-color: #0a0a0c !important;
          scrollbar-width: thin;
          scrollbar-color: #27272a #0a0a0c;
        }
        .terminal-container {
            padding: 12px 16px;
        }
        .terminal-container .xterm-screen {
            padding: 0 !important;
        }
        .terminal-container .xterm {
            cursor: text;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Terminal;
