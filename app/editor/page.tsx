'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Play, Files, Search as SearchIcon, CheckSquare, Plus, Minus, SquareTerminal, Bug, Save, Github, GitBranch, ShieldCheck } from 'lucide-react';
import FileExplorer from '../components/editor/FileExplorer';
import Search from '../components/editor/Search';
import Analysis from '../components/editor/Analysis';
import Terminal from '../components/editor/Terminal'
import Debug from '../components/editor/Debug';
import SourceControl from '../components/editor/SourceControl';
import DiffView from '../components/editor/DiffView';
import QualityAudit from '../components/editor/QualityAudit'; // Import the new auditor
import DiscardConfirmationModal from '../components/editor/DiscardConfirmationModal';
import TabBar, { Tab } from '../components/editor/TabBar';

// Centeralized Language Mapper
export const getMonacoLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'js':
      case 'jsx': return 'javascript';
      case 'ts':
      case 'tsx': return 'typescript';
      case 'json': return 'json';
      case 'html': return 'html';
      case 'css':
      case 'scss': return 'css';
      case 'md':
      case 'mdx': return 'markdown';
      case 'java': return 'java';
      case 'cpp':
      case 'c':
      case 'h':
      case 'hpp': return 'cpp';
      case 'go': return 'go';
      case 'sh':
      case 'bash': return 'shell';
      case 'sql': return 'sql';
      case 'yml':
      case 'yaml': return 'yaml';
      default: return 'javascript';
    }
};

import { useSearchParams } from 'next/navigation';
import { useProject } from '../components/ProjectContext';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const EditorPage = () => {
  const { projectName, setProjectName } = useProject();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<monaco.editor.FindMatch[]>([]);
  const [currentExplorerPath, setCurrentExplorerPath] = useState<string>('.'); 
  const [explorerItems, setExplorerItems] = useState<any[]>([]); 
  const [expanded, setExpanded] = useState<string[]>([]); 
  const [fontSize, setFontSize] = useState(16);
  const [output, setOutput] = useState<string | null>(null);
  const [stdin, setStdin] = useState("");
  const [refreshExplorer, setRefreshExplorer] = useState(false);
  const [analysis, setAnalysis] = useState<{ explanation: string; suggestions: string[]; model: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debugAnalysis, setDebugAnalysis] = useState<{ explanation: string; suggestions: string[] } | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [selectedModel, setSelectedModel] = useState('mistral-codestral2');
  const [repoFullName, setRepoFullName] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  
  // DIFF MODE STATE
  const [isDiffMode, setIsDiffMode] = useState(false);

  // Resizable Sidebar
  const [sidebarWidth, setSidebarWidth] = useState(400); 
  const isResizing = useRef(false);

  // TABBED INTERFACE STATES
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [addedFiles, setAddedFiles] = useState<string[]>([]); // Track newly created paths
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  const uniqueChangesCount = useMemo(() => {
    const modifiedCount = tabs.filter(t => t.content !== t.originalContent).length;
    const addedCount = addedFiles.length;
    return modifiedCount + addedCount;
  }, [tabs, addedFiles]);

  const onFileCreated = (path: string) => {
    setAddedFiles(prev => [...new Set([...prev, path])]);
  };

  const handleItemDeleted = (path: string) => {
    // 1. Remove everything starting with this path from added tracking
    setAddedFiles(prev => prev.filter(p => p !== path && !p.startsWith(path + '/')));
    
    // 2. Remove everything starting with this path from tabs
    setTabs(prev => {
        const newTabs = prev.filter(t => t.id !== path && !t.id.startsWith(path + '/'));
        if (activeTabId === path || (activeTabId && activeTabId.startsWith(path + '/'))) {
            setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        }
        return newTabs;
    });
  };

  const handleNotify = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // FULL SCM REFRESH LOGIC
  const handleRefreshSCM = async () => {
    setRefreshExplorer(prev => !prev);
    
    if (!repoFullName || tabs.length === 0) return;

    handleNotify("Refreshing Source Control status...", "success");

    try {
        const updatedTabs = await Promise.all(tabs.map(async (tab) => {
            try {
                const res = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(tab.id)}`);
                const data = await res.json();
                if (res.ok && data.item?.content) {
                    const latestContent = atob(data.item.content.replace(/\n/g, ''));
                    return { ...tab, originalContent: latestContent };
                }
            } catch (e) {}
            return tab;
        }));
        setTabs(updatedTabs);
    } catch (error) {
        console.error("SCM Refresh Error:", error);
    }
  };

  // Persistence
  useEffect(() => {
    const savedTabs = localStorage.getItem('ide-open-tabs');
    const savedActiveTabId = localStorage.getItem('ide-active-tab-id');
    const savedWidth = localStorage.getItem('ide-sidebar-width');
    const savedAdded = localStorage.getItem('ide-added-files');
    
    if (savedTabs) {
      try {
        let parsedTabs = JSON.parse(savedTabs);
        if (Array.isArray(parsedTabs)) {
            parsedTabs = parsedTabs.map((tab: any) => ({ ...tab, language: getMonacoLanguage(tab.id) }));
            setTabs(parsedTabs);
        }
        if (savedActiveTabId) setActiveTabId(savedActiveTabId);
      } catch (e) {}
    }
    if (savedAdded) {
        try {
            setAddedFiles(JSON.parse(savedAdded));
        } catch(e) {}
    }
    if (savedWidth) setSidebarWidth(parseInt(savedWidth));
  }, []);

  useEffect(() => {
    localStorage.setItem('ide-open-tabs', JSON.stringify(tabs));
    if (activeTabId) localStorage.setItem('ide-active-tab-id', activeTabId);
    localStorage.setItem('ide-added-files', JSON.stringify(addedFiles));
  }, [tabs, activeTabId, addedFiles]);

  // Resizing Logic
  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX - 60;
    if (newWidth > 200 && newWidth < 800) {
      setSidebarWidth(newWidth);
      localStorage.setItem('ide-sidebar-width', String(newWidth));
    }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setActiveView(prev => prev ? null : 'explorer');
      }
      if ((e.metaKey || e.ctrlKey)) {
        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            setFontSize(s => s + 2);
        } else if (e.key === '-') {
            e.preventDefault();
            setFontSize(s => Math.max(8, s - 2));
        } else if (e.key === '0') {
            e.preventDefault();
            setFontSize(16);
        }
      }
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setWordWrap(prev => prev === 'on' ? 'off' : 'on');
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeTabId, activeView]);

  useEffect(() => {
    const repo = searchParams.get('repo');
    if (repo) {
        setRepoFullName(repo);
        setProjectName(repo.split('/')[1]);
        setActiveView('explorer');
    }
  }, [searchParams]);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    editor.updateOptions({ fontSize: fontSize });
  };

  const handleFileClick = async (filePath: string) => {
    setIsDiffMode(false); // Switch to normal mode on explorer click
    if (tabs.find(t => t.id === filePath)) {
        setActiveTabId(filePath);
        return;
    }

    try {
      if (repoFullName) {
        const response = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(filePath)}`);
        const data = await response.json();
        if (response.ok && data.item && data.item.content) {
            const decoded = atob(data.item.content.replace(/\n/g, ''));
            const newTab: Tab = {
                id: filePath,
                name: data.item.name,
                content: decoded,
                originalContent: decoded
            };
            setTabs(prev => [...prev, newTab]);
            setActiveTabId(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const closeTab = (tabId: string) => {
    setTabs(prev => {
        const newTabs = prev.filter(t => t.id !== tabId);
        if (activeTabId === tabId) {
            setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        }
        return newTabs;
    });
  };

  const handleContentChange = (newValue: string | undefined) => {
    if (activeTabId && newValue !== undefined) {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: newValue } : t));
    }
  };

  const handleGitHubCommit = async (message: string) => {
    if (!repoFullName || !activeTab) return;
    setIsCommitting(true);
    try {
      const response = await fetch('/api/github/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName, path: activeTab.id, content: activeTab.content, message }),
      });

      if (response.ok) {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, originalContent: t.content } : t));
        setAddedFiles(prev => prev.filter(path => path !== activeTab.id));
        setSnackbarMessage('Committed successfully to GitHub!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setIsDiffMode(false); // Exit diff mode on success
      }
    } catch (error: any) {
      setSnackbarMessage(`Error: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleGitHubPull = async () => {
    if (!repoFullName || !activeTabId) return;
    try {
      const response = await fetch(`/api/github/pull?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(activeTabId)}`);
      const data = await response.json();
      if (response.ok && data.content) {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: data.content, originalContent: data.content } : t));
        setSnackbarMessage('Pulled latest changes from GitHub successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (error: any) {
      setSnackbarMessage(`Error: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleAnalyzeCode = async () => {
    if (!activeTab) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeTab.content, modelId: selectedModel }),
      });
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      setAnalysis({ explanation: 'Failed to analyze code.', suggestions: [], model: '' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderActiveView = () => {
    if (!activeView) return null;
    
    interface ChangedFile {
        name: string;
        path: string;
        status: 'modified' | 'added';
    }

    const modifiedTabs: ChangedFile[] = tabs.filter(t => t.content !== t.originalContent).map(t => ({ 
        name: t.name, path: t.id, status: 'modified'
    }));
    
    const newFileEntries: ChangedFile[] = addedFiles.map(path => ({
        name: path.split('/').pop() || path,
        path: path,
        status: 'added'
    }));

    const uniqueChanges: ChangedFile[] = [...newFileEntries];
    modifiedTabs.forEach(mt => {
        if (!uniqueChanges.find(c => c.path === mt.path)) uniqueChanges.push(mt);
    });

    return (
      <div className="h-full relative">
        {activeView === 'explorer' && (
          <FileExplorer 
            currentExplorerPath={currentExplorerPath} explorerItems={explorerItems}
            onItemExpansionToggle={() => {}} onItemSelectionToggle={(e, id) => handleFileClick(id)}
            onPathChange={(p) => setCurrentExplorerPath(p)} expandedItems={expanded}
            onExpandedItemsChange={(e, ids) => setExpanded(ids)} onFileUpload={() => {}}
            isUploadingFile={false} refreshExplorer={refreshExplorer} 
            activeFileName={activeTabId || ''} repoFullName={repoFullName} 
            onItemCreated={onFileCreated}
            onItemDeleted={handleItemDeleted}
            onNotify={handleNotify}
          />
        )}
        {activeView === 'search' && <Search searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchResults={searchResults} goToMatch={() => {}} />}
        {activeView === 'scm' && (
          <SourceControl 
            changedFiles={uniqueChanges} onCommit={handleGitHubCommit} isCommitting={isCommitting} 
            onRefresh={handleRefreshSCM}
            onDiscard={() => setIsDiscardModalOpen(true)}
            onPush={() => handleGitHubCommit("Manual push from editor")}
            onPull={handleGitHubPull} onSync={async () => { await handleGitHubPull(); handleGitHubCommit("Sync changes"); }}
            onFileClick={(path) => {
                handleFileClick(path);
                setIsDiffMode(true); // Open in diff mode from SCM panel
            }}
          />
        )}
        {activeView === 'analysis' && <Analysis analysis={analysis} isAnalyzing={isAnalyzing} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />}
        {activeView === 'debug' && <Debug analysis={debugAnalysis} isAnalyzing={isDebugging} onDebug={() => {}} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />}
        {activeView === 'audit' && <QualityAudit code={activeTab?.content || ''} selectedModel={selectedModel} onNotify={handleNotify} />}
        {activeView === 'output' && <Terminal output={output} stdin={stdin} setStdin={setStdin} />}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-base overflow-hidden select-none text-textPrimary">
      <div className="flex-1 h-full flex flex-col min-w-0">
        <TabBar 
            tabs={tabs} 
            activeTabId={activeTabId} 
            onTabClick={(id) => { setActiveTabId(id); setIsDiffMode(false); }} 
            onTabClose={closeTab}
            onRun={handleAnalyzeCode}
        />
        
        <div className="flex-1 relative">
            {isDiffMode && activeTab ? (
                <DiffView 
                    key={`diff-${activeTab.id}`}
                    original={activeTab.originalContent}
                    modified={activeTab.content}
                    language={getMonacoLanguage(activeTab.id)}
                    fileName={activeTab.name}
                    onClose={() => setIsDiffMode(false)}
                />
            ) : (
                <Editor 
                    key={`editor-${activeTabId || 'untitled'}`}
                    height="100%" 
                    path={activeTabId || 'untitled'}
                    language={activeTabId ? getMonacoLanguage(activeTabId) : 'javascript'} 
                    value={activeTab?.content || ''}
                    onChange={handleContentChange}
                    onMount={handleEditorDidMount} 
                    theme="vs-dark" 
                    options={{ fontSize, automaticLayout: true, minimap: { enabled: false }, wordWrap, scrollBeyondLastLine: false }} 
                />
            )}
        </div>
      </div>

      {activeView && (
        <div onMouseDown={startResizing} className="w-[4px] h-full cursor-col-resize bg-borderLine hover:bg-highlight transition-colors z-50 shrink-0" />
      )}

      <div style={{ width: activeView ? `${sidebarWidth}px` : '0px' }} className="p-4 h-full border-l border-borderLine shrink-0 overflow-hidden transition-[width] duration-75 ease-out">
        {renderActiveView()}
      </div>

      <div className="bg-base p-2 flex flex-col items-center space-y-4 border-l border-borderLine h-full shrink-0">
        <button onClick={() => setActiveView(v => v === 'explorer' ? null : 'explorer')} className={`p-2 rounded-md ${activeView === 'explorer' ? 'text-highlight' : 'text-textSecondary'}`} title="Explorer (Ctrl+B)"><Files size={24} /></button>
        <button onClick={() => setActiveView(v => v === 'scm' ? null : 'scm')} className={`p-2 rounded-md ${activeView === 'scm' ? 'text-highlight' : 'text-textSecondary'} relative`} title="Source Control">
            <Github size={24} />
            {uniqueChangesCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-highlight rounded-full" />}
        </button>
        <button onClick={() => setActiveView(v => v === 'search' ? null : 'search')} className={`p-2 rounded-md ${activeView === 'search' ? 'text-highlight' : 'text-textSecondary'}`} title="Search"><SearchIcon size={24} /></button>
        <button onClick={() => setActiveView(v => v === 'analysis' ? null : 'analysis')} className={`p-2 rounded-md ${activeView === 'analysis' ? 'text-highlight' : 'text-textSecondary'}`} title="AI Analysis"><CheckSquare size={24} /></button>
        <button onClick={() => setActiveView(v => v === 'audit' ? null : 'audit')} className={`p-2 rounded-md ${activeView === 'audit' ? 'text-highlight' : 'text-textSecondary'}`} title="Quality Audit"><ShieldCheck size={24} /></button>
        <button onClick={() => setActiveView(v => v === 'debug' ? null : 'debug')} className={`p-2 rounded-md ${activeView === 'debug' ? 'text-highlight' : 'text-textSecondary'}`} title="Debug"><Bug size={24} /></button>
        <button onClick={() => setActiveView(v => v === 'output' ? null : 'output')} className={`p-2 rounded-md ${activeView === 'output' ? 'text-highlight' : 'text-textSecondary'}`} title="Output"><SquareTerminal size={24} /></button>
      </div>

      <DiscardConfirmationModal isOpen={isDiscardModalOpen} onClose={() => setIsDiscardModalOpen(false)} onConfirm={() => {
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: t.originalContent } : t));
          setSnackbarMessage('Changes discarded.');
          setSnackbarOpen(true);
      }} />

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity={snackbarSeverity}>{snackbarMessage}</Alert>
      </Snackbar>
    </div>
  );
};

export default EditorPage;
