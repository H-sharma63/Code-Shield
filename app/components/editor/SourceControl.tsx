'use client';

import { useState, useEffect } from 'react';
import { Github, Send, Loader2, FileCode, Check, RefreshCw, ArrowUp, ArrowDown, RotateCcw, MoreHorizontal, GitBranch, Plus, GitPullRequest, ChevronRight, ChevronDown, ShieldAlert, Info, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';

interface ChangedFile {
  name: string;
  path: string;
  status: 'modified' | 'added' | 'deleted';
}

interface PRMetadata {
    number: number;
    title: string;
    user: { login: string };
    created_at: string;
    html_url: string;
    body: string;
}

interface PRIssue {
    severity: 'high' | 'medium' | 'low';
    file: string;
    line: string;
    description: string;
}

interface PRReviewData {
    overview: string;
    keyChanges: string[];
    issues: PRIssue[];
    suggestions: string[];
    conclusion: string;
    model?: string;
}

interface SourceControlProps {
  changedFiles: ChangedFile[];
  onCommit: (message: string) => Promise<void>;
  isCommitting: boolean;
  branchName?: string;
  branches?: string[];
  repoFullName?: string | null;
  selectedModel?: string;
  onBranchChange?: (branch: string) => void;
  onCreateBranch?: (name: string) => void;
  onGenerateCommitMessage?: () => Promise<string | null>;
  onRefresh?: () => void;
  onPush?: () => void;
  onPull?: () => void;
  onSync?: () => void;
  onDiscard?: () => void;
  onFileClick?: (path: string) => void;
  onNotify?: (message: string, severity: 'success' | 'error') => void;
}

export default function SourceControl({ 
    changedFiles, onCommit, isCommitting, branchName = 'main', 
    branches = ['main'], repoFullName, selectedModel = 'gemini-3.1-pro-preview',
    onBranchChange, onCreateBranch, onGenerateCommitMessage,
    onRefresh, onPush, onPull, onSync, onDiscard, onFileClick, onNotify
}: SourceControlProps) {
  const [message, setMessage] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // PR Section States
  const [showPRs, setShowPRs] = useState(true);
  const [pullRequests, setPullRequests] = useState<PRMetadata[]>([]);
  const [isPRLoading, setIsPRLoading] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PRMetadata | null>(null);
  const [prReview, setPrReview] = useState<PRReviewData | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const handleCommit = async () => {
    if (!message.trim()) return;
    await onCommit(message);
    setMessage('');
  };

  const handleCreateBranch = () => {
    if (newBranchName.trim()) {
        onCreateBranch?.(newBranchName.trim());
        setNewBranchName('');
        setIsCreatingBranch(false);
        setShowBranchMenu(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!onGenerateCommitMessage) return;
    setIsGeneratingMessage(true);
    try {
        const msg = await onGenerateCommitMessage();
        if (msg) setMessage(msg);
    } finally {
        setIsGeneratingMessage(false);
    }
  };

  const fetchPRs = async () => {
    if (!repoFullName) return;
    setIsPRLoading(true);
    try {
        const res = await fetch(`/api/github/pull-requests?repo=${encodeURIComponent(repoFullName)}`);
        const data = await res.json();
        if (res.ok) {
            setPullRequests(data.pullRequests || []);
        }
    } catch (e) {
        onNotify?.("Failed to fetch PRs", "error");
    } finally {
        setIsPRLoading(false);
    }
  };

  const handleRunReview = async (prNumber: number) => {
    setIsReviewing(true);
    setPrReview(null);
    try {
        const res = await fetch('/api/github/pull-requests/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoFullName, prNumber, modelId: selectedModel }),
        });
        const data = await res.json();
        if (res.ok) {
            setPrReview(data);
            onNotify?.("PR review complete.", "success");
        } else {
            onNotify?.(data.message || "Review failed.", "error");
        }
    } catch (e) {
        onNotify?.("Error during review.", "error");
    } finally {
        setIsReviewing(false);
    }
  };

  useEffect(() => {
    if (repoFullName) fetchPRs();
  }, [repoFullName]);

  return (
    <div className="h-full bg-cardPanel mt-[14px] rounded-lg flex flex-col border border-borderLine overflow-hidden">
      {/* Header with Branch and Actions */}
      <div className="p-4 border-b border-borderLine shrink-0">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-textPrimary uppercase tracking-widest flex items-center">
                <Github size={16} className="mr-2 text-highlight" />
                Source Control
            </h2>
            <div className="flex items-center space-x-1 relative">
                <button onClick={() => { onRefresh?.(); fetchPRs(); }} title="Refresh" className="p-1 hover:bg-white/10 rounded text-textSecondary hover:text-textPrimary"><RotateCcw size={14} /></button>
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

        <div className="relative">
            <div className="flex items-center justify-between bg-base/50 p-2 rounded border border-borderLine mb-2">
                <div 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors flex-1"
                    onClick={() => setShowBranchMenu(!showBranchMenu)}
                >
                    <GitBranch size={14} className="text-highlight" />
                    <span className="text-xs font-mono text-highlight truncate max-w-[120px]">{branchName}</span>
                </div>
                <div className="flex items-center space-x-2 border-l border-borderLine pl-2">
                    <button onClick={onPull} title="Pull" className="text-textSecondary hover:text-highlight"><ArrowDown size={14} /></button>
                    <button onClick={onPush} title="Push" className="text-textSecondary hover:text-highlight"><ArrowUp size={14} /></button>
                    <button onClick={onSync} title="Sync" className="text-textSecondary hover:text-highlight"><RefreshCw size={14} /></button>
                </div>
            </div>

            {showBranchMenu && (
                <div className="absolute left-0 top-full mt-1 w-full bg-cardPanel border border-borderLine rounded-md shadow-2xl z-30 flex flex-col max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-borderLine bg-base/30 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-textSecondary uppercase">Switch Branch</span>
                        <button 
                            onClick={() => setIsCreatingBranch(!isCreatingBranch)}
                            className="p-1 hover:bg-white/10 rounded text-highlight"
                            title="New Branch"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {isCreatingBranch && (
                        <div className="p-2 border-b border-borderLine bg-base/20">
                            <input 
                                autoFocus
                                type="text"
                                placeholder="Branch name..."
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                                className="w-full bg-base border border-borderLine rounded px-2 py-1 text-xs text-textPrimary focus:border-highlight outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                            />
                        </div>
                    )}

                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {branches.map((b) => (
                            <button
                                key={b}
                                onClick={() => { onBranchChange?.(b); setShowBranchMenu(false); }}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/5 transition-colors ${b === branchName ? 'text-highlight bg-highlight/5' : 'text-textPrimary'}`}
                            >
                                <span className="truncate">{b}</span>
                                {b === branchName && <Check size={12} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* CHANGES SECTION */}
        <div className="p-4 border-b border-borderLine bg-base/10">
            <div className="flex items-start space-x-2 mb-4">
                <div className="flex-1 bg-base border border-borderLine rounded px-3 py-2 focus-within:border-highlight transition-all relative group">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Commit message (Ctrl+Enter)..."
                        className="w-full bg-transparent border-none outline-none text-xs text-textPrimary placeholder:text-textSecondary resize-none h-12 pr-6"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleCommit();
                            }
                        }}
                    />
                    <button 
                        onClick={handleGenerateAI}
                        disabled={isGeneratingMessage || changedFiles.length === 0}
                        className="absolute bottom-2 right-2 p-1 text-textSecondary hover:text-highlight transition-colors disabled:opacity-30"
                        title="Generate AI Commit Message"
                    >
                        {isGeneratingMessage ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    </button>
                </div>
                <button
                    onClick={handleCommit}
                    disabled={isCommitting || !message.trim()}
                    className="p-3 bg-highlight hover:bg-highlight/80 text-black rounded-lg disabled:opacity-50 transition-all flex items-center justify-center shrink-0"
                    title="Commit Changes"
                >
                    {isCommitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>

            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-textSecondary uppercase tracking-widest">Changes ({changedFiles.length})</span>
            </div>

            <div className="space-y-1">
                {changedFiles.length === 0 ? (
                    <p className="text-[11px] text-textSecondary italic py-2">No changes detected.</p>
                ) : (
                    changedFiles.map((file) => (
                        <div 
                            key={file.path} 
                            onClick={() => onFileClick?.(file.path)}
                            className="flex items-center justify-between p-2 hover:bg-white/5 rounded cursor-pointer group"
                        >
                            <div className="flex items-center space-x-2 truncate">
                                <FileCode size={14} className={file.status === 'added' ? 'text-green-400' : 'text-highlight'} />
                                <span className="text-xs text-textPrimary truncate">{file.name}</span>
                            </div>
                            <span className={`text-[9px] font-bold uppercase px-1 rounded ${
                                file.status === 'added' ? 'text-green-400' : 'text-highlight'
                            }`}>
                                {file.status === 'added' ? 'A' : 'M'}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* PULL REQUESTS SECTION */}
        <div className="border-b border-borderLine">
            <button 
                onClick={() => setShowPRs(!showPRs)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center space-x-2">
                    <GitPullRequest size={14} className="text-highlight" />
                    <span className="text-[10px] font-bold text-textSecondary uppercase tracking-widest">Pull Requests</span>
                </div>
                {showPRs ? <ChevronDown size={14} className="text-textSecondary" /> : <ChevronRight size={14} className="text-textSecondary" />}
            </button>

            {showPRs && (
                <div className="p-2 space-y-1 bg-base/5">
                    {isPRLoading ? (
                        <div className="py-4 flex justify-center"><Loader2 size={16} className="animate-spin text-highlight" /></div>
                    ) : selectedPR ? (
                        /* SELECTED PR VIEW */
                        <div className="p-2 animate-in fade-in slide-in-from-right-2 duration-200">
                            <button 
                                onClick={() => { setSelectedPR(null); setPrReview(null); }}
                                className="text-[9px] text-highlight hover:underline font-bold mb-2 uppercase"
                            >
                                ← Back to list
                            </button>
                            <div className="bg-base/40 p-3 rounded-lg border border-borderLine mb-3">
                                <h3 className="text-[11px] font-bold text-textPrimary mb-1">#{selectedPR.number} {selectedPR.title}</h3>
                                <p className="text-[10px] text-textSecondary line-clamp-2">{selectedPR.body || "No description."}</p>
                            </div>

                            {!prReview ? (
                                <button
                                    onClick={() => handleRunReview(selectedPR.number)}
                                    disabled={isReviewing}
                                    className="w-full bg-highlight hover:bg-highlight/80 text-black font-bold py-1.5 rounded flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mb-2"
                                >
                                    {isReviewing ? (
                                        <>
                                            <Loader2 className="animate-spin" size={12} />
                                            <span className="text-[10px] uppercase font-black">Analyzing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldAlert size={12} />
                                            <span className="text-[10px] uppercase font-black">AI Review Diff</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className={`p-2 rounded text-center font-black text-[10px] uppercase border ${
                                        prReview.conclusion.toLowerCase().includes('approve') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                                    }`}>
                                        Verdict: {prReview.conclusion}
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-[9px] font-bold text-highlight uppercase mb-1 flex items-center"><Info size={10} className="mr-1"/> Overview</h4>
                                        <p className="text-[10px] text-textPrimary leading-relaxed italic border-l-2 border-highlight pl-2">{prReview.overview}</p>
                                    </div>

                                    {prReview.keyChanges.length > 0 && (
                                        <div>
                                            <h4 className="text-[9px] font-bold text-highlight uppercase mb-1 flex items-center"><CheckCircle2 size={10} className="mr-1"/> Key Changes</h4>
                                            <ul className="space-y-0.5">
                                                {prReview.keyChanges.slice(0, 5).map((change, i) => (
                                                    <li key={i} className="text-[9px] text-textSecondary flex items-start">
                                                        <span className="text-highlight mr-1">•</span>
                                                        {change}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {prReview.issues.length > 0 && (
                                        <div>
                                            <h4 className="text-[9px] font-bold text-highlight uppercase mb-1 flex items-center"><ShieldAlert size={10} className="mr-1"/> Issues ({prReview.issues.length})</h4>
                                            <div className="space-y-1">
                                                {prReview.issues.slice(0, 3).map((issue, i) => (
                                                    <div key={i} className="bg-red-500/5 p-1.5 rounded text-[9px] border border-red-500/10">
                                                        <span className="font-bold text-red-400 block">{issue.file}:{issue.line}</span>
                                                        <p className="text-textSecondary">{issue.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* PR LIST */
                        pullRequests.length === 0 ? (
                            <p className="text-center text-textSecondary text-[10px] py-4">No open PRs found.</p>
                        ) : (
                            pullRequests.map((pr) => (
                                <div 
                                    key={pr.number}
                                    onClick={() => setSelectedPR(pr)}
                                    className="p-2 hover:bg-white/5 rounded cursor-pointer group flex items-start space-x-2 transition-colors border border-transparent hover:border-borderLine"
                                >
                                    <MessageSquare size={12} className="text-textSecondary group-hover:text-highlight mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] text-textPrimary font-medium truncate group-hover:text-highlight">#{pr.number} {pr.title}</div>
                                        <div className="text-[9px] text-textSecondary uppercase font-bold opacity-60">@{pr.user.login}</div>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-2 bg-base/30 border-t border-borderLine shrink-0">
        <p className="text-[9px] text-textSecondary text-center italic uppercase tracking-tighter">
          Source Control & Review Engine v2.0
        </p>
      </div>
    </div>
  );
}
