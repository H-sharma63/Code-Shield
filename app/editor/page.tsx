'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo, } from 'react';
import { useSession } from 'next-auth/react';
import Editor, { Monaco } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { Play, Files, Search as SearchIcon, CheckSquare, Plus, Minus, SquareTerminal, Bug, Save, Github, GitBranch, ShieldCheck } from 'lucide-react';
import FileExplorer from '../components/editor/FileExplorer';
import Search from '../components/editor/Search';
import Analysis from '../components/editor/Analysis';
import Terminal from '../components/editor/Terminal'
import Debug from '../components/editor/Debug';
import SourceControl from '../components/editor/SourceControl';
import DiffView from '../components/editor/DiffView';
import QualityAudit from '../components/editor/QualityAudit';
import DiscardConfirmationModal from '../components/editor/DiscardConfirmationModal';
import TabBar, { Tab } from '../components/editor/TabBar';
import { getContextFromTabs, getDeepProjectContext } from '../lib/editor/workspace-context';

interface GlobalSearchResult {
  path: string;
  name: string;
  matches: { line: number; text: string }[];
}

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
  const { data: session } = useSession();
  const { projectName, setProjectName } = useProject();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
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
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-pro-preview');
  const [analysisScope, setAnalysisScope] = useState<'file' | 'project'>('file');

  const [repoFullName, setRepoFullName] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');

  // DIFF & REFACTOR STATE
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [refactoredContent, setRefactoredContent] = useState<string | null>(null);
  const [isRefactoring, setIsRefactoring] = useState(false);

  // Resizable Sidebar
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const isResizing = useRef(false);

  // Bottom Terminal Panel
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(300);
  const isResizingTerminal = useRef(false);

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
    setAddedFiles(prev => prev.filter(p => p !== path && !p.startsWith(path + '/')));
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
        } catch (e) { }
        return tab;
      }));
      setTabs(updatedTabs);
    } catch (error) {
      console.error("SCM Refresh Error:", error);
    }
  };

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
      } catch (e) { }
    }
    if (savedAdded) {
      try {
        setAddedFiles(JSON.parse(savedAdded));
      } catch (e) { }
    }
    if (savedWidth) {
      const parsed = parseInt(savedWidth);
      const maxAllowed = Math.min(500, window.innerWidth * 0.45);
      setSidebarWidth(Math.max(200, Math.min(parsed, maxAllowed)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ide-open-tabs', JSON.stringify(tabs));
    if (activeTabId) localStorage.setItem('ide-active-tab-id', activeTabId);
    localStorage.setItem('ide-added-files', JSON.stringify(addedFiles));
  }, [tabs, activeTabId, addedFiles]);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    isResizingTerminal.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = window.innerWidth - e.clientX - 60;
      const maxAllowed = Math.min(500, window.innerWidth * 0.45);
      if (newWidth > 200 && newWidth < maxAllowed) {
        setSidebarWidth(newWidth);
        localStorage.setItem('ide-sidebar-width', String(newWidth));
      }
    } else if (isResizingTerminal.current) {
      const newHeight = window.innerHeight - e.clientY - 40;
      if (newHeight > 100 && newHeight < 600) {
        setTerminalHeight(newHeight);
      }
    }
  }, []);

  const startTerminalResizing = useCallback(() => {
    isResizingTerminal.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'row-resize';
  }, [handleMouseMove, stopResizing]);

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

  useEffect(() => {
    const isNewProject = searchParams.get('newProject') === 'true';
    const pName = searchParams.get('projectName');
    const fName = searchParams.get('fileName');
    const repo = searchParams.get('repo');

    if (isNewProject && fName && session?.user?.email) {
      const content = localStorage.getItem('newProjectContent') || '';

      const saveNewProject = async () => {
        try {
          const res = await fetch('/api/save-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectName: pName || fName.split('.')[0],
              fileName: fName,
              fileData: content
            }),
          });
          if (res.ok) {
            handleNotify("Project initialized and saved to mainframe.", "success");
            // Update tabs with the new file
            const newTab: Tab = {
              id: fName,
              name: fName,
              content: content,
              originalContent: content
            };
            setTabs([newTab]);
            setActiveTabId(fName);
            // Remove the param so we don't save again on refresh
            const newUrl = window.location.pathname + (repo ? `?repo=${repo}` : '');
            window.history.replaceState({}, '', newUrl);
          }
        } catch (e) {
          console.error("Auto-save error:", e);
        }
      };
      saveNewProject();
    }
  }, [searchParams, session]);

  // GLOBAL Search Logic (Project-Wide)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery && searchQuery.length > 2 && repoFullName) {
        setIsGlobalSearching(true);
        try {
          const response = await fetch(`/api/github/search?repo=${encodeURIComponent(repoFullName)}&q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          if (response.ok) {
            setSearchResults(data.results || []);
          }
        } catch (error) {
          console.error("Global search error:", error);
        } finally {
          setIsGlobalSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 1000); // 1s debounce to avoid rate limits

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, repoFullName]);

  const handleSearchResultClick = async (path: string, line: number) => {
    let tab = tabs.find(t => t.id === path);

    if (!tab) {
      // Fetch and open the file if not already open
      try {
        const res = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName!)}&path=${encodeURIComponent(path)}`);
        const data = await res.json();
        if (res.ok && data.item) {
          const content = atob(data.item.content.replace(/\n/g, ''));
          const newTab: Tab = {
            id: path,
            name: data.item.name,
            content: content,
            language: getMonacoLanguage(path),
            originalContent: content,
          };
          setTabs([...tabs, newTab]);
          setActiveTabId(path);
          tab = newTab;
        }
      } catch (e) {
        handleNotify("Failed to open file from search.", "error");
        return;
      }
    } else {
      setActiveTabId(path);
    }

    // Now jump to line using monaco
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(line, 1); // 1 = Smooth
        editorRef.current.setSelection({
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: 1000
        });
        editorRef.current.focus();
      }
    }, 200); // Small delay to let tab switch
  };

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    editor.updateOptions({ fontSize: fontSize });
  };

  const handleFileClick = async (filePath: string) => {
    setIsDiffMode(false);
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
        setIsDiffMode(false);
      }
    } catch (error: any) {
      setSnackbarMessage(`Error: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleSmartFix = async () => {
    if (!activeTab || !repoFullName) return;

    setIsRefactoring(true);
    handleNotify("Generating Smart Fix...", "success");
    try {
      const response = await fetch('/api/refactor', {
        method: 'POST',
        body: JSON.stringify({
          code: activeTab.content,
          context: analysis?.suggestions.join('\n'),
          action: 'fix',
          modelId: selectedModel
        })
      });
      const data = await response.json();
      if (response.ok) {
        setRefactoredContent(data.code);
        setIsDiffMode(true);
      } else {
        handleNotify(data.message || "Failed to generate fix.", "error");
      }
    } catch (e) {
      handleNotify("Error generating fix.", "error");
    } finally {
      setIsRefactoring(false);
    }
  };

  const handleGenTests = async () => {
    if (!activeTab || !repoFullName) return;

    setIsRefactoring(true);
    handleNotify("Generating Unit Tests...", "success");
    try {
      const response = await fetch('/api/refactor', {
        method: 'POST',
        body: JSON.stringify({
          code: activeTab.content,
          context: "Generate professional unit tests for this file.",
          action: 'test',
          modelId: selectedModel
        })
      });
      const data = await response.json();
      if (response.ok) {
        const testFileName = activeTab.name.replace(/\.[^/.]+$/, "") + ".test" + activeTab.name.substring(activeTab.name.lastIndexOf("."));
        const testPath = activeTab.id.substring(0, activeTab.id.lastIndexOf('/') + 1) + testFileName;

        const newTab: Tab = {
          id: testPath,
          name: testFileName,
          content: data.code,
          language: activeTab.language,
          originalContent: ""
        };
        setTabs([...tabs, newTab]);
        setActiveTabId(testPath);
        handleNotify(`Generated test file: ${testFileName}`, "success");
      } else {
        handleNotify(data.message || "Failed to generate tests.", "error");
      }
    } catch (e) {
      handleNotify("Error generating tests.", "error");
    } finally {
      setIsRefactoring(false);
    }
  };

  const handleAcceptDiff = (newContent: string) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: newContent } : t));
    setIsDiffMode(false);
    setRefactoredContent(null);
    handleNotify("Changes applied successfully.", "success");
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
      let context = '';
      if (analysisScope === 'project') {
        handleNotify("Gathering Deep Project Context (Tree + Source)...", "success");
        context = repoFullName ? await getDeepProjectContext(repoFullName) : getContextFromTabs(tabs);
      }

      const response = await fetch('/api/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeTab.content,
          modelId: selectedModel,
          context: context
        }),
      });
      const data = await response.json();
      setAnalysis(data);
      if (analysisScope === 'project') handleNotify("Deep Project Analysis Complete.", "success");
    } catch (error) {
      setAnalysis({ explanation: 'Failed to analyze code.', suggestions: [], model: '' });
      handleNotify("Analysis failed. See console for details.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunCode = async () => {
    if (!activeTab) return;
    setIsTerminalOpen(true);
    setOutput("Running...");
    try {
      const languageIdMap: { [key: string]: number } = {
        'python': 71,
        'javascript': 63,
        'typescript': 74,
        'java': 62,
        'cpp': 54,
        'go': 60,
      };
      const langId = languageIdMap[getMonacoLanguage(activeTab.id)] || 63;

      const response = await fetch('/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeTab.content, language_id: langId, stdin: stdin }),
      });
      const result = await response.json();
      if (result.stdout || result.stderr || result.compile_output) {
        setOutput((result.stdout || "") + (result.stderr || "") + (result.compile_output || ""));
      } else {
        setOutput("Program finished with no output.");
      }
    } catch (error) {
      setOutput("Failed to run code.");
    }
  };

  const renderActiveView = () => {
    if (!activeView) return null;
    interface ChangedFile { name: string; path: string; status: 'modified' | 'added'; }
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
            onItemExpansionToggle={() => { }} onItemSelectionToggle={(e, id) => handleFileClick(id)}
            onPathChange={(p) => setCurrentExplorerPath(p)} expandedItems={expanded}
            onExpandedItemsChange={(e, ids) => setExpanded(ids)} onFileUpload={() => { }}
            isUploadingFile={false} refreshExplorer={refreshExplorer}
            activeFileName={activeTabId || ''} repoFullName={repoFullName}
            onItemCreated={onFileCreated} onItemDeleted={handleItemDeleted} onNotify={handleNotify}
          />
        )}
        {activeView === 'search' && (
          <Search
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            isSearching={isGlobalSearching}
            onResultClick={handleSearchResultClick}
          />
        )}
        {activeView === 'scm' && (
          <SourceControl
            changedFiles={uniqueChanges} onCommit={handleGitHubCommit} isCommitting={isCommitting}
            onRefresh={handleRefreshSCM}
            onDiscard={() => setIsDiscardModalOpen(true)}
            onPush={() => handleGitHubCommit("Manual push from editor")}
            onPull={handleGitHubPull} onSync={async () => { await handleGitHubPull(); handleGitHubCommit("Sync changes"); }}
            onFileClick={(path) => { handleFileClick(path); setIsDiffMode(true); }}
          />
        )}
        {activeView === 'analysis' && (
          <Analysis
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            analysisScope={analysisScope}
            setAnalysisScope={setAnalysisScope}
            onAnalyze={handleAnalyzeCode}
            onSmartFix={handleSmartFix}
            onGenTests={handleGenTests}
          />
        )}
        {activeView === 'debug' && <Debug analysis={debugAnalysis} isAnalyzing={isDebugging} onDebug={() => { }} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />}
        {activeView === 'audit' && (
          <QualityAudit
            code={activeTab?.content || ''}
            selectedModel={selectedModel}
            repoFullName={repoFullName}
            onNotify={handleNotify}
            onSmartFix={handleSmartFix}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#09090b] overflow-hidden select-none text-textPrimary font-vscode-ui">
      {/* 1. Main Content Area (Editor + Bottom Terminal) */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-[#09090b]">
        {/* Editor Wrapper */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            repoFullName={repoFullName}
            onTabClick={(id) => { setActiveTabId(id); setIsDiffMode(false); }}
            onTabClose={closeTab}
            onFileClick={handleFileClick}
            onRun={handleAnalyzeCode}
          />

          <div className="flex-1 relative">
            {isDiffMode && activeTab ? (
              <DiffView
                key={`diff-${activeTab.id}`}
                original={activeTab.originalContent}
                modified={refactoredContent || activeTab.content}
                language={getMonacoLanguage(activeTab.id)}
                fileName={activeTab.name}
                onClose={() => { setIsDiffMode(false); setRefactoredContent(null); }}
                onAccept={handleAcceptDiff}
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
                options={{
                  fontSize,
                  fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
                  automaticLayout: true,
                  minimap: { enabled: false },
                  wordWrap,
                  scrollBeyondLastLine: false,
                }}
              />
            )}
          </div>
        </div>

        {/* Bottom Terminal Panel */}
        {isTerminalOpen && (
          <>
            <div onMouseDown={startTerminalResizing} className="h-[2px] w-full cursor-row-resize bg-white/5 hover:bg-highlight transition-colors z-50 shrink-0" />
            <div style={{ height: `${terminalHeight}px` }} className="shrink-0 bg-black animate-in slide-in-from-bottom duration-200">
              <Terminal output={output} stdin={stdin} setStdin={setStdin} />
            </div>
          </>
        )}
      </div>

      {/* 2. Sidebar View Area (Right Side) */}
      {activeView && (
        <>
          <div
            onMouseDown={startResizing}
            className="w-1.5 h-full cursor-col-resize bg-white/5 hover:bg-highlight/50 transition-all z-50 shrink-0 group relative"
          >
            <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
          </div>
          <div
            style={{
              width: `${sidebarWidth}px`,
              containerType: 'inline-size'
            } as any}
            className="h-full border-l border-borderLine shrink-0 overflow-hidden bg-cardPanel animate-in slide-in-from-right duration-200"
          >
            {renderActiveView()}
          </div>
        </>
      )}

      {/* 3. Sidebar Button Bar (Far Right) */}
      <div className="bg-[#121214] p-2 flex flex-col items-center space-y-4 border-l border-white/5 h-full shrink-0 z-50">
        <button onClick={() => setActiveView(v => v === 'explorer' ? null : 'explorer')} className={`p-2 rounded-lg transition-all ${activeView === 'explorer' ? 'bg-highlight/10 text-highlight shadow-[0_0_10px_rgba(255,222,89,0.2)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="Explorer (Ctrl+B)"><Files size={22} /></button>
        <button onClick={() => setActiveView(v => v === 'scm' ? null : 'scm')} className={`p-2 rounded-lg transition-all relative ${activeView === 'scm' ? 'bg-highlight/10 text-highlight shadow-[0_0_10px_rgba(255,222,89,0.2)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="Source Control">
          <Github size={22} />
          {uniqueChangesCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-highlight rounded-full border-2 border-[#121214]" />}
        </button>
        <button onClick={() => setActiveView(v => v === 'search' ? null : 'search')} className={`p-2 rounded-lg transition-all ${activeView === 'search' ? 'bg-highlight/10 text-highlight shadow-[0_0_10px_rgba(255,222,89,0.2)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="Search"><SearchIcon size={22} /></button>
        <div className="w-8 h-px bg-white/5 mx-auto" />
        <button onClick={() => setActiveView(v => v === 'analysis' ? null : 'analysis')} className={`p-2 rounded-lg transition-all ${activeView === 'analysis' ? 'bg-highlight/10 text-highlight shadow-[0_0_10px_rgba(255,222,89,0.2)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="AI Analysis"><CheckSquare size={22} /></button>
        <button onClick={() => setActiveView(v => v === 'audit' ? null : 'audit')} className={`p-2 rounded-lg transition-all ${activeView === 'audit' ? 'bg-highlight/10 text-highlight shadow-[0_0_10px_rgba(255,222,89,0.2)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="Quality Audit"><ShieldCheck size={22} /></button>
        <button onClick={() => setActiveView(v => v === 'debug' ? null : 'debug')} className={`p-2 rounded-lg transition-all ${activeView === 'debug' ? 'bg-highlight/10 text-highlight shadow-[0_0_10px_rgba(255,222,89,0.2)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="Debug"><Bug size={22} /></button>

        <div className="mt-auto pb-4 flex flex-col items-center space-y-4">
          <button onClick={() => setIsTerminalOpen(!isTerminalOpen)} className={`p-2 rounded-lg transition-all ${isTerminalOpen ? 'bg-highlight text-black shadow-[0_0_15px_rgba(255,222,89,0.4)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="Terminal">
            <SquareTerminal size={22} />
          </button>
        </div>
      </div>

      <DiscardConfirmationModal isOpen={isDiscardModalOpen} onClose={() => setIsDiscardModalOpen(false)} onConfirm={() => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: t.originalContent } : t));
        setSnackbarMessage('Changes discarded.');
        setSnackbarOpen(true);
      }} />

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity={snackbarSeverity} variant="filled" sx={{ borderRadius: '12px', fontWeight: 'bold' }}>{snackbarMessage}</Alert>
      </Snackbar>
    </div>
  );
};

export default EditorPage;
