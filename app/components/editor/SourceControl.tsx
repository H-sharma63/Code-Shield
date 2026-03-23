'use client';

import { useState } from 'react';
import { Github, Send, Loader2, FileCode, Check, RefreshCw, ArrowUp, ArrowDown, RotateCcw, MoreHorizontal } from 'lucide-react';

interface ChangedFile {
  name: string;
  path: string;
  status: 'modified' | 'added' | 'deleted';
}

interface SourceControlProps {
  changedFiles: ChangedFile[];
  onCommit: (message: string) => Promise<void>;
  isCommitting: boolean;
  branchName?: string;
  onRefresh?: () => void;
  onPush?: () => void;
  onPull?: () => void;
  onSync?: () => void;
  onDiscard?: () => void;
  onFileClick?: (path: string) => void; // Added for Diff View
}

export default function SourceControl({ 
    changedFiles, onCommit, isCommitting, branchName = 'main', 
    onRefresh, onPush, onPull, onSync, onDiscard, onFileClick 
}: SourceControlProps) {
  const [message, setMessage] = useState('');
  const [showActions, setShowActions] = useState(false);

  const handleCommit = async () => {
    if (!message.trim()) return;
    await onCommit(message);
    setMessage('');
  };

  return (
    <div className="h-full bg-cardPanel mt-[14px] rounded-lg flex flex-col border border-borderLine">
      {/* Header with Branch and Actions */}
      <div className="p-4 border-b border-borderLine">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-textPrimary uppercase tracking-widest flex items-center">
                <Github size={16} className="mr-2 text-highlight" />
                Source Control
            </h2>
            <div className="flex items-center space-x-1 relative">
                <button onClick={onRefresh} title="Refresh" className="p-1 hover:bg-white/10 rounded text-textSecondary hover:text-textPrimary"><RotateCcw size={14} /></button>
                <button 
                    onClick={() => setShowActions(!showActions)} 
                    title="More Actions..." 
                    className="p-1 hover:bg-white/10 rounded text-textSecondary hover:text-textPrimary"
                >
                    <MoreHorizontal size={14} />
                </button>
                
                {showActions && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-cardPanel border border-borderLine rounded-md shadow-xl z-20 overflow-hidden">
                        <button 
                            onClick={() => { onDiscard?.(); setShowActions(false); }}
                            className="w-full text-left px-4 py-2 text-xs text-textPrimary hover:bg-white/5 transition-colors"
                        >
                            Discard All Changes
                        </button>
                    </div>
                )}
            </div>
        </div>

        <div className="flex items-center justify-between bg-base/50 p-2 rounded border border-borderLine mb-2">
            <div className="flex items-center space-x-2">
                <span className="text-[10px] text-textSecondary uppercase font-bold tracking-tighter">Branch:</span>
                <span className="text-xs font-mono text-highlight">{branchName}</span>
            </div>
            <div className="flex items-center space-x-2 border-l border-borderLine pl-2">
                <button onClick={onPull} title="Pull" className="text-textSecondary hover:text-highlight"><ArrowDown size={14} /></button>
                <button onClick={onPush} title="Push" className="text-textSecondary hover:text-highlight"><ArrowUp size={14} /></button>
                <button onClick={onSync} title="Sync" className="text-textSecondary hover:text-highlight"><RefreshCw size={14} /></button>
            </div>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Commit Input Area */}
        <div className="space-y-3 mb-6">
            <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message (Enter to commit)"
            className="w-full p-3 rounded-lg bg-base text-textPrimary text-sm border border-borderLine focus:border-primaryAccent outline-none resize-none h-24"
            disabled={isCommitting}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleCommit();
                }
            }}
            />
            <button
            onClick={handleCommit}
            disabled={isCommitting || !message.trim() || changedFiles.length === 0}
            className="w-full bg-primaryAccent hover:opacity-90 text-white font-bold py-2 rounded-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
            {isCommitting ? (
                <Loader2 className="animate-spin" size={18} />
            ) : (
                <>
                <Check size={18} />
                <span>Commit</span>
                </>
            )}
            </button>
        </div>

        <h3 className="text-[10px] font-bold text-textSecondary uppercase tracking-widest mb-3 px-1 border-b border-borderLine pb-1">
            Changes ({changedFiles.length})
        </h3>
        
        {changedFiles.length === 0 ? (
            <p className="text-xs text-textSecondary italic text-center py-8">No changes detected.</p>
        ) : (
            <div className="space-y-1">
            {changedFiles.map((file, idx) => (
                <div 
                key={idx} 
                onClick={() => onFileClick?.(file.path)}
                className="flex items-center justify-between p-2 rounded-md hover:bg-white/5 group cursor-pointer"
                >
                <div className="flex items-center space-x-2 overflow-hidden">
                    <FileCode size={14} className={file.status === 'added' ? 'text-green-400' : 'text-highlight'} />
                    <span className="text-xs text-textPrimary truncate">{file.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${file.status === 'added' ? 'text-green-400' : 'text-highlight'}`}>
                        {file.status === 'added' ? 'U' : 'M'}
                    </span>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>

      <div className="p-2 bg-base/30 border-t border-borderLine">
        <p className="text-[9px] text-textSecondary text-center italic">
          Tip: Click a file to view changes side-by-side.
        </p>
      </div>
    </div>
  );
}
