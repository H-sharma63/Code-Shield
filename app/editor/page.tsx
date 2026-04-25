'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo, } from 'react';
import { useSession } from 'next-auth/react';
import Editor, { Monaco } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { 
  SquareTerminal, 
  Files, 
  Search as SearchIcon, 
  Github, 
  CheckSquare, 
  ShieldCheck, 
  Key, 
  Bug,
  ChevronUp,
  ChevronDown,
  Play,
  Plus,
  Minus,
  Save,
  GitBranch,
  ExternalLink,
  Network,
  Bot
} from 'lucide-react';
import FileExplorer from '../components/editor/FileExplorer';
import Search from '../components/editor/Search';
import Analysis from '../components/editor/Analysis';
import Terminal from '../components/editor/Terminal'
import Debug from '../components/editor/VisualDebugger';
import SourceControl from '../components/editor/SourceControl';
import DiffView from '../components/editor/DiffView';
import QualityAudit from '@/app/components/editor/QualityAudit';
import EnvManager from '@/app/components/editor/EnvManager';
import ArchitectureTabView from '@/app/components/editor/ArchitectureTabView';
import DiscardConfirmationModal from '../components/editor/DiscardConfirmationModal';
import GeminiCLI from '../components/editor/GeminiCLI';
import TabBar, { Tab } from '../components/editor/TabBar';
import { getContextFromTabs, getDeepProjectContext } from '../lib/editor/workspace-context';
import { createATA } from '../lib/editor/ata';
import { ShieldSyncEngine, ChangedFile } from '../lib/editor/shield-sync';
import { OPFSStorage } from '../lib/editor/opfs-storage';
import { useWorkspace } from '../components/editor/WorkspaceContext';
import UnsavedChangesModal from '../components/editor/UnsavedChangesModal';
import { AgentSplitView } from '../components/agents/AgentSplitView';

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
import { useRouter } from 'next/navigation';

const EditorPage = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [notifications, setNotifications] = useState<{id: number, message: string, severity: 'success' | 'error' | 'info' | 'warning'}[]>([]);

  const handleNotify = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotifications(prev => [...prev, { id: Date.now(), message, severity }]);
  }, []);
  const { 
    bootStatus,
    serverUrl,
    serverUrls,
    publicUrls,
    lastDiagnostic,
    setLastDiagnostic,
    nodeModulesMissing, 
    changedFiles, 
    socket, 
    persistFile,
    syncProject,
    commitChanges,
    sendCommand,
    createSession,
    boot,
    diagnostics,
    setDiagnostics
  } = useWorkspace();

  const [nodeModulesDismissed, setNodeModulesDismissed] = useState(false);
  const { projectName, setProjectName } = useProject();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const ataRef = useRef<any>(null);
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
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const breakpointDecorations = useRef<string[]>([]);

  const [repoFullName, setRepoFullName] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ name: string; commit: string; protected: boolean }[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const [showAdvancedTools, setShowAdvancedTools] = useState(true);

  useEffect(() => {
    if (repoFullName && bootStatus === 'idle') {
      const [owner, repo] = repoFullName.split('/');
      boot(owner, repo);
    }
  }, [repoFullName, bootStatus, boot]);

  // DIFF & REFACTOR STATE
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [refactoredContent, setRefactoredContent] = useState<string | null>(null);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  // 🛰️ Localhost Proxy Overlay (Global Fetch Interceptor)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
      
      // 🚫 HIGH PRIORITY: Never redirect Auth or Project Internal APIs
      if (urlStr && (urlStr.includes('/api/auth') || urlStr.includes('__nextjs'))) {
          return originalFetch(input, init);
      }

      if (urlStr && urlStr.includes('localhost:')) {
         try {
           const url = new URL(urlStr);
           const port = parseInt(url.port);
           if (serverUrls[port]) {
              const targetUrl = serverUrls[port];
              const newUrl = urlStr.replace(`localhost:${port}`, new URL(targetUrl).host);
              console.log(`\x1b[36m[CodeShield Proxy]\x1b[0m Redirecting \x1b[1m${urlStr}\x1b[0m -> \x1b[32m${newUrl}\x1b[0m`);
              return originalFetch(newUrl, init);
           }
         } catch (e) {}
      }
      return originalFetch(input, init);
    };
    return () => { window.fetch = originalFetch; };
  }, [serverUrls]);

  useEffect(() => {
    if (lastDiagnostic) setDiagnosticOpen(true);
  }, [lastDiagnostic]);

  // 🚫 Global Browser Shortcut Intercept
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes('mac');
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (cmdOrCtrl) {
        const key = e.key.toLowerCase();
        
        // Allow basic system text editing shortcuts and refresh
        const allowedEditingKeys = ['c', 'v', 'x', 'a', 'z', 'y', 'r'];
        if (allowedEditingKeys.includes(key)) {
            return;
        }

        // Prevent other common shortcuts we might want to block (s, d, f, g, etc)
        // to stop CHROME actions. (Monaco will still get the event if it's focused)
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: false });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: false });
  }, []);

  const [isRefactoring, setIsRefactoring] = useState(false);
  const [notifiedPorts, setNotifiedPorts] = useState<Set<number>>(new Set());
  const [portNotice, setPortNotice] = useState<{ port: number, url: string } | null>(null);

  // 🚀 Professional 'Run Project' Logic
  const handleRunProject = () => {
    if (nodeModulesMissing) {
      handleNotify("Dependencies missing. Please run 'npm install' first.", 'warning');
      setIsTerminalOpen(true);
      return;
    }

    handleNotify("Launching dev server...", 'success');
    setIsTerminalOpen(true);
    sendCommand('npm run dev');
  };

  // BROWSER PREVIEW STATE
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (serverUrl) {
      setIsPreviewOpen(true);
    }
  }, [serverUrl]);

  // Resizable Sidebar
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const isResizing = useRef(false);

  // Bottom Terminal Panel
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(300); // 🏗️ Balanced default height
  const isResizingTerminal = useRef(false);

  // 🛰️ SIGNAL LISTENER: Terminal-to-Editor Bridge
  useEffect(() => {
    const handleRemoteOpen = (e: any) => {
        const { path, content } = e.detail;
        const name = path.split('/').pop() || path;
        const newTab: Tab = {
            id: path,
            name,
            content,
            language: getMonacoLanguage(path),
            originalContent: content
        };
        setTabs(prev => {
            if (prev.find(t => t.id === path)) return prev;
            return [...prev, newTab];
        });
        setActiveTabId(path);
        handleNotify(`AI Agent pushed file: ${name}`, 'success');
    };

    window.addEventListener('codeshield-open-file' as any, handleRemoteOpen);
    
    const handleRemoteAgent = (e: any) => {
        setIsTerminalOpen(true);
    };
    window.addEventListener('codeshield-open-agent' as any, handleRemoteAgent);

    return () => {
        window.removeEventListener('codeshield-open-file' as any, handleRemoteOpen);
        window.removeEventListener('codeshield-open-agent' as any, handleRemoteAgent);
    };
  }, [handleNotify, createSession, sendCommand]);

  // TABBED INTERFACE STATES
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [addedFiles, setAddedFiles] = useState<string[]>([]); // Track newly created paths
  const [isCommitting, setIsCommitting] = useState(false);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  // 🔍 Real-time Monaco Diagnostics Bridge
  useEffect(() => {
    if (!monacoRef.current) return;
    
    const handleMarkerChange = () => {
      const markers = monacoRef.current!.editor.getModelMarkers({});
      const newDiagnostics: any[] = markers.map(m => ({
        id: `${m.owner}-${m.startLineNumber}-${m.message}`,
        filePath: tabs.find(t => t.id === activeTabId)?.name || 'active file',
        line: m.startLineNumber,
        message: m.message,
        severity: m.severity === 8 ? 'error' : m.severity === 4 ? 'warning' : 'info',
        source: m.source || 'Monaco'
      }));
      setDiagnostics(newDiagnostics);
    };

    const disposable = monacoRef.current.editor.onDidChangeMarkers(handleMarkerChange);
    return () => disposable.dispose();
  }, [tabs, activeTabId, setDiagnostics]);

  const handleAgentFileCreate = (name: string, content: string) => {
    const newPath = `ai/${name}`;
    const newTab: Tab = {
        id: newPath,
        name,
        content,
        language: getMonacoLanguage(name),
        originalContent: ''
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newPath);
    handleNotify(`Agent created file: ${name}`, 'success');
  };

  const searchParams = useSearchParams();
  const [lastActiveCodeTabId, setLastActiveCodeTabId] = useState<string | null>(null);
  
  // Tab Management Extras
  const [tabToClose, setTabToClose] = useState<string | null>(null);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  const uniqueChangesCount = useMemo(() => {
    return changedFiles.length;
  }, [changedFiles]);

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

  const handleRefreshSCM = async () => {
    setRefreshExplorer(prev => !prev);
    if (!repoFullName || tabs.length === 0) return;
    try {
      const updatedTabs = await Promise.all(tabs.map(async (tab) => {
        try {
          const res = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(tab.id)}&ref=${currentBranch}`);
          const data = await res.json();
          if (res.ok && data.item?.content) {
            const latestContent = atob(data.item.content.replace(/\s/g, ''));
            return { ...tab, originalContent: latestContent };
          } else if (res.status === 404) {
            // If file doesn't exist on GitHub (newly created), originalContent is empty
            return { ...tab, originalContent: "" };
          }
        } catch (e) { }
        return tab;
      }));
      setTabs(updatedTabs);
    } catch (error) {
      console.error("SCM Refresh Error:", error);
    }
  };

  const fetchBranches = useCallback(async (repo: string) => {
    try {
      const res = await fetch(`/api/github/branches?repo=${encodeURIComponent(repo)}`);
      const data = await res.json();
      if (res.ok) {
        setBranches(data.branches);
      }
    } catch (e) {
      console.error("Failed to fetch branches:", e);
    }
  }, []);

  const handleBranchChange = async (branchName: string) => {
    if (!repoFullName) return;
    setCurrentBranch(branchName);
    handleNotify(`Switched to branch: ${branchName}`, "success");
    // Reload file explorer for the new branch
    setRefreshExplorer(prev => !prev);
    // Optionally reload open tabs from the new branch
    const updatedTabs = await Promise.all(tabs.map(async (tab) => {
      try {
        const res = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(tab.id)}&ref=${branchName}`);
        const data = await res.json();
        if (res.ok && data.item?.content) {
          const latestContent = atob(data.item.content.replace(/\s/g, ''));
          return { ...tab, originalContent: latestContent, content: latestContent };
        }
      } catch (e) { }
      return tab;
    }));
    setTabs(updatedTabs);
  };

  const handleCreateBranch = async (branchName: string) => {
    if (!repoFullName) return;
    try {
      const res = await fetch('/api/github/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName, branchName, fromBranch: currentBranch }),
      });
      if (res.ok) {
        handleNotify(`Branch ${branchName} created and switched.`, "success");
        await fetchBranches(repoFullName);
        setCurrentBranch(branchName);
      } else {
        const data = await res.json();
        handleNotify(data.message || "Failed to create branch.", "error");
      }
    } catch (e) {
      handleNotify("Error creating branch.", "error");
    }
  };

  useEffect(() => {
    if (repoFullName) {
      fetchBranches(repoFullName);
    }
  }, [repoFullName, fetchBranches]);

  useEffect(() => {
    // Restore sidebar width (still global, it's a UX preference)
    const savedWidth = localStorage.getItem('ide-sidebar-width');
    if (savedWidth) {
      const parsed = parseInt(savedWidth);
      const maxAllowed = Math.min(500, window.innerWidth * 0.45);
      setSidebarWidth(Math.max(200, Math.min(parsed, maxAllowed)));
    }
    // 🏗️ NUCLEAR RESET: Ensure terminal starts at a sane height
    setTerminalHeight(300);
  }, []);

  // 📂 Restore repo-scoped tabs when repoFullName becomes available
  useEffect(() => {
    if (!repoFullName) return;
    const key = `ide-tabs-${repoFullName}`;
    const keyActive = `ide-active-tab-${repoFullName}`;
    const keyAdded = `ide-added-files-${repoFullName}`;

    const savedTabs = localStorage.getItem(key);
    const savedActiveTabId = localStorage.getItem(keyActive);
    const savedAdded = localStorage.getItem(keyAdded);

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
      try { setAddedFiles(JSON.parse(savedAdded)); } catch (e) { }
    }
  }, [repoFullName]);

  // 💾 Save repo-scoped tabs whenever they change
  useEffect(() => {
    if (!repoFullName) return;
    const key = `ide-tabs-${repoFullName}`;
    const keyActive = `ide-active-tab-${repoFullName}`;
    const keyAdded = `ide-added-files-${repoFullName}`;

    localStorage.setItem(key, JSON.stringify(tabs));
    if (activeTabId) {
      localStorage.setItem(keyActive, activeTabId);
      if (!activeTabId.startsWith('codeshield://')) {
        setLastActiveCodeTabId(activeTabId);
      }
    }
    localStorage.setItem(keyAdded, JSON.stringify(addedFiles));
  }, [tabs, activeTabId, addedFiles, repoFullName]);

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
      const newHeight = window.innerHeight - e.clientY;
      const maxHeight = window.innerHeight * 0.7; // Clamp to 70% max
      if (newHeight > 100 && newHeight < maxHeight) {
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

  const handleSave = useCallback(async () => {
    if (!activeTab) return;
    
    try {
      // Persist to OPFS (this now auto-syncs to GCP VM via WorkspaceContext)
      await persistFile(activeTab.id, activeTab.content);
      
      // Mark as clean in UI (update originalContent)
      setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, originalContent: t.content } : t));
      
      handleNotify(`Saved ${activeTab.name}`, 'success');
    } catch (e) {
      handleNotify(`Failed to save: ${activeTab.name}`, 'error');
    }
  }, [activeTab, persistFile, handleNotify]);

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
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeTabId, activeView, handleSave]);

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
          const content = atob(data.item.content.replace(/\s/g, ''));
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

    // Configure Monaco TypeScript Compiler Options
    monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monacoInstance.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monacoInstance.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monacoInstance.languages.typescript.JsxEmit.Preserve,
      reactNamespace: "React",
      allowJs: true,
      baseUrl: "file:///",
      paths: {
        "@/*": ["file:///*", "file:///src/*"]
      }
    });

    // Suppress "Cannot find module" (2307) for imports not loaded in Monaco
    monacoInstance.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [2307]
    });

    // 🔴 BREAKPOINT CLICK HANDLER
    editor.onMouseDown((e) => {
      if (e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          setBreakpoints((prev) => {
            const next = new Set(prev);
            if (next.has(lineNumber)) next.delete(lineNumber);
            else next.add(lineNumber);
            return next;
          });
        }
      }
    });

    // 🏆 INITIALIZE ATA
    if (!ataRef.current) {
      ataRef.current = createATA(monacoInstance);
    }

    // ⌨️ MONACO KEYBINDINGS
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
        handleSave();
    });
  };

  // 🔴 UPDATE BREAKPOINT DECORATIONS
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    
    console.log('Syncing breakpoints:', Array.from(breakpoints));

    const decorations = Array.from(breakpoints).map(line => ({
        range: new monacoRef.current!.Range(line, 1, line, 1),
        options: {
            isWholeLine: true,
            glyphMarginClassName: 'breakpoint-glyph',
            glyphMarginHoverMessage: { value: 'Breakpoint' }
        }
    }));

    breakpointDecorations.current = editorRef.current.deltaDecorations(
        breakpointDecorations.current,
        decorations
    );

    // Sync with backend if socket exists
    if (socket && activeTabId) {
        socket.emit('debug:breakpoints', { 
            file: activeTabId, 
            lines: Array.from(breakpoints) 
        });
    }
  }, [breakpoints, socket, activeTabId]);

  // Run ATA when active tab changes unconditionally (so it runs on initial open too)
  useEffect(() => {
    if (activeTab?.content && ataRef.current) {
      try {
        ataRef.current(activeTab.content);
      } catch (e) {
        console.error("Initial ATA Error:", e);
      }
    }
  }, [activeTab?.content, activeTabId]);

  const handleFileClick = async (filePath: string, forceOpen = false) => {
    if (filePath === 'codeshield://debug') {
        const debugTabId = 'codeshield://debug';
        
        // TOGGLE LOGIC: If already active, close the tab and switch back
        if (activeTabId === debugTabId && !forceOpen) {
            setTabs(prev => {
                const newTabs = prev.filter(t => t.id !== debugTabId);
                if (lastActiveCodeTabId && newTabs.find(t => t.id === lastActiveCodeTabId)) {
                    setActiveTabId(lastActiveCodeTabId);
                } else {
                    setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
                }
                return newTabs;
            });
            return;
        }

        if (!tabs.find(t => t.id === debugTabId)) {
            const newTab: Tab = {
                id: debugTabId,
                name: 'Neural Debugger',
                content: '',
                originalContent: '',
                language: 'plaintext'
            };
            setTabs(prev => [...prev, newTab]);
        }
        setActiveTabId(debugTabId);
        return;
    }

    if (filePath === 'codeshield://architecture') {
        const archTabId = 'codeshield://architecture';
        
        // TOGGLE LOGIC: If already active, close the tab and switch back
        if (activeTabId === archTabId && !forceOpen) {
            setTabs(prev => {
                const newTabs = prev.filter(t => t.id !== archTabId);
                if (lastActiveCodeTabId && newTabs.find(t => t.id === lastActiveCodeTabId)) {
                    setActiveTabId(lastActiveCodeTabId);
                } else {
                    setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
                }
                return newTabs;
            });
            return;
        }

        if (!tabs.find(t => t.id === archTabId)) {
            const newTab: Tab = {
                id: archTabId,
                name: 'Architecture Map',
                content: '',
                originalContent: '',
                language: 'plaintext'
            };
            setTabs(prev => [...prev, newTab]);
        }
        setActiveTabId(archTabId);
        return;
    }

    if (tabs.find(t => t.id === filePath) && !forceOpen) {
      setActiveTabId(filePath);
      return;
    }

    try {
      if (repoFullName) {
        const response = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(filePath)}`);
        const data = await response.json();
        if (response.ok && data.item && data.item.content) {
          const decoded = atob(data.item.content.replace(/\s/g, ''));
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
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // 🛑 Dirty Check: If modified, show confirmation modal
    if (tab.content !== tab.originalContent) {
      setTabToClose(tabId);
      return;
    }

    forceCloseTab(tabId);
  };

  const forceCloseTab = (tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      return newTabs;
    });
    setTabToClose(null);
  };

  const handleContentChange = (newValue: string | undefined) => {
    if (activeTabId && newValue !== undefined) {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: newValue } : t));

      // 🚀 TRIGGER ATA
      if (ataRef.current) {
        try {
          ataRef.current(newValue);
        } catch(e) {
          console.error("ATA Error:", e);
        }
      }
    }
  };

  const handleGitHubCommit = async (msg: string) => {
    if (!repoFullName) return;
    setIsCommitting(true);
    try {
      const success = await commitChanges(msg);
      if (success) {
        handleNotify("Successfully committed and pushed to GitHub!", 'success');
        // Update local UI state
        setTabs(prev => prev.map(t => ({ ...t, originalContent: t.content })));
        setIsDiffMode(false);
      } else {
        handleNotify("Commit failed. Please try again.", 'error');
      }
    } catch (e: any) {
        handleNotify(`Error: ${e.message}`, 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  // 🕵️ PERSISTENT CHANGE DETECTION MOVED TO CONTEXT
  // (Removed local interval)

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

  const handleApplyDiagnostic = async () => {
    if (!lastDiagnostic || !socket) return;

    if (lastDiagnostic.type === 'turbopack_wasm') {
      try {
        handleNotify("Applying Turbopack Fix...", "success");
        // 1. Target package.json
        let pkgContent = "";
        const pkgPath = 'package.json';
        
        // Check if open in tabs first
        const pkgTab = tabs.find(t => t.id === pkgPath);
        if (pkgTab) {
          pkgContent = pkgTab.content;
        } else {
          // If not open, we can't easily read it from the remote backend in this simple architecture yet.
          handleNotify("Please open package.json to apply this fix automatically.", "warning");
          return;
        }

        // 2. Patch the dev script (Force NEXT_TURBO=0 and --webpack)
        let updated = pkgContent;
        
        // Match any "dev": "..." script
        updated = pkgContent.replace(/"dev":\s*"([^"]*)"/g, (match, script) => {
           let newScript = script;
           if (!newScript.includes('NEXT_TURBO=0')) newScript = `NEXT_TURBO=0 ${newScript}`;
           if (!newScript.includes('--webpack')) newScript = `${newScript} --webpack`;
           return `"dev": "${newScript.trim()}"`;
        });

        if (updated !== pkgContent) {
           // 3. Save
           socket.emit('sync-file', { filePath: pkgPath, content: updated });
           await persistFile(pkgPath, updated);
           
           // 4. 🔥 HARD RESET: Tell the backend to clear the cache
           // (This would require a specific backend command, but running 'rm -rf .next' in the terminal works too)
           sendCommand('rm -rf .next');

           // Update tabs if open
           setTabs(prev => prev.map(t => t.id === pkgPath ? { ...t, content: updated, originalContent: updated } : t));
           
           handleNotify("Applied Ultra-Fix! Restarting dev server will now work.", "success");
           setLastDiagnostic(null);
           setDiagnosticOpen(false);
        } else {
           handleNotify("Fix already applied. Try creating a NEW terminal session (+).", "warning");
           setLastDiagnostic(null);
           setDiagnosticOpen(false);
        }
      } catch (e) {
        handleNotify("Failed to apply fix automatically.", "error");
      }
    }
  };

  const handleGitHubPull = async () => {
    if (!repoFullName) return;
    handleNotify("Fetching latest from GitHub...", 'info');
    try {
        // Trigger a fresh sync, skipping the 'warm' check to force a fetch
        await syncProject(repoFullName, true);
        handleNotify("Project updated from GitHub!", 'success');
    } catch (e) {
        handleNotify("Failed to pull from GitHub.", 'error');
    }
  };

  const handleGenerateCommitMessage = async () => {
    if (!repoFullName) return null;
    try {
      const modifiedChanges = tabs
        .filter(t => t.content !== t.originalContent)
        .map(t => ({
          path: t.id,
          content: t.content,
          originalContent: t.originalContent,
          status: 'modified'
        }));
      const addedChanges = addedFiles.map(path => ({ path, status: 'added' }));
      const allChanges = [...modifiedChanges, ...addedChanges];

      if (allChanges.length === 0) return null;

      const res = await fetch('/api/github/generate-commit-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: allChanges, modelId: selectedModel }),
      });
      const data = await res.json();
      if (res.ok) {
        return data.commitMessage;
      } else {
        handleNotify(data.message || "Failed to generate message.", "error");
      }
    } catch (e) {
      handleNotify("Error during generation.", "error");
    }
    return null;
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

  const handleNeuralFix = async (suggestion: string) => {
    if (!activeTab || !repoFullName) return;
    setIsRefactoring(true);
    handleNotify("Applying Neural Fix...", "success");
    try {
      const response = await fetch('/api/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeTab.content,
          context: suggestion,
          action: 'fix',
          modelId: selectedModel
        })
      });
      const data = await response.json();
      if (response.ok) {
        setRefactoredContent(data.code);
        setIsDiffMode(true);
        handleNotify("Neural Fix generated. Review in Diff View.", "success");
      } else {
        handleNotify(data.message || "Failed to apply fix.", "error");
      }
    } catch (e) {
      handleNotify("Error during Neural Fix.", "error");
    } finally {
      setIsRefactoring(false);
    }
  };

  const renderActiveView = () => {
    if (!activeView) return null;
    return (
      <div className="h-full relative">
        {activeView === 'explorer' && (
          <FileExplorer
            onFileClick={handleFileClick}
            currentExplorerPath={currentExplorerPath} explorerItems={explorerItems}
            onItemExpansionToggle={() => { }} onItemSelectionToggle={(e, id) => handleFileClick(id)}
            onPathChange={(p) => setCurrentExplorerPath(p)} expandedItems={expanded}
            onExpandedItemsChange={(e, ids) => setExpanded(ids)} onFileUpload={() => { }}
            isUploadingFile={false} refreshExplorer={refreshExplorer}
            activeFileName={activeTabId || ''} repoFullName={repoFullName}
            branchName={currentBranch}
            onItemCreated={onFileCreated} onItemDeleted={handleItemDeleted} onNotify={handleNotify}
            onSwitchToEnvManager={() => setActiveView('env')}
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
            changedFiles={changedFiles} onCommit={handleGitHubCommit} isCommitting={isCommitting}
            onRefresh={handleRefreshSCM}
            onDiscard={() => setIsDiscardModalOpen(true)}
            onPush={() => handleGitHubCommit("Manual push from editor")}
            onPull={handleGitHubPull} onSync={async () => { await handleGitHubPull(); handleGitHubCommit("Sync changes"); }}
            onFileClick={(path) => { handleFileClick(path); setIsDiffMode(true); }}
            branchName={currentBranch}
            branches={branches.map(b => b.name)}
            onBranchChange={handleBranchChange}
            onCreateBranch={handleCreateBranch}
            onGenerateCommitMessage={handleGenerateCommitMessage}
            repoFullName={repoFullName}
            selectedModel={selectedModel}
            onNotify={handleNotify}
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
        {activeView === 'env' && <EnvManager repoFullName={repoFullName} onNotify={handleNotify} />}
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
      <div className="flex-1 h-full flex flex-col min-w-0 bg-[#09090b] relative">
        {/* 🤖 Editor Area */}
        <div className="flex-1 flex min-h-0 relative">
          <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              repoFullName={repoFullName}
              publicUrls={publicUrls}
              onTabClick={(id) => { setActiveTabId(id); setIsDiffMode(false); }}
              onTabClose={closeTab}
              onFileClick={handleFileClick}
              onRun={handleRunProject}
            />

            <div className="flex-1 flex min-h-0 relative">
               {/* 📂 LEFT PANEL: Code / Debug / Architecture / CLI */}
               <div className="flex-1 relative min-w-0">
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
                  ) : activeTabId === 'codeshield://architecture' ? (
                    <ArchitectureTabView />
                  ) : activeTabId === 'codeshield://debug' ? (
                    <Debug 
                      onApplyFix={handleNeuralFix}
                      selectedModel={selectedModel} 
                      setSelectedModel={setSelectedModel}
                      activeFileContent={tabs.find(t => t.id === lastActiveCodeTabId)?.content || ''}
                      activeFileName={tabs.find(t => t.id === lastActiveCodeTabId)?.name || 'no file selected'}
                    />
                  ) : activeTabId === 'codeshield://cli' ? (
                    <GeminiCLI />
                  ) : (
                    <Editor
                      key={`editor-${activeTabId || 'untitled'}`}
                      height="100%"
                      path={activeTabId || 'untitled'}
                      language={getMonacoLanguage(activeTabId || 'javascript')}
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
          </div>
        </div>

        {/* 🛰️ Universal Command Center: V8 Isolated Engine */}
        <div className={`flex flex-col shrink-0 ${!isTerminalOpen ? 'hidden' : 'flex'} border-t border-white/5 bg-[#09090b]`}>
          <div
            onMouseDown={startTerminalResizing}
            className="h-[2px] w-full cursor-row-resize bg-white/5 hover:bg-indigo-500/50 hover:shadow-[0_-5px_15px_rgba(129,140,248,0.4)] transition-all duration-300 z-50 group relative"
          >
            <div className="absolute inset-x-0 -top-2 -bottom-2 cursor-row-resize" />
          </div>
          <div style={{ height: `${terminalHeight}px`, maxHeight: '60vh' }} className="bg-[#09090b] overflow-hidden flex flex-col relative">
            <Terminal
              projectId={repoFullName || 'default'}
              fileToSync={activeTab ? { path: activeTab.id, content: activeTab.content } : null}
              onClose={() => setIsTerminalOpen(false)}
              isMaximized={isTerminalMaximized}
              onMaximizeToggle={() => setIsTerminalMaximized(!isTerminalMaximized)}
              problems={diagnostics}
              onProblemClick={(path, line) => {
                handleFileClick(path);
                // Future: Add line-scrolling logic here
              }}
            />
          </div>
        </div>

        {/* 🚀 OVERLAY: Maximized Terminal Pane */}
        {isTerminalMaximized && isTerminalOpen && (
           <div className="absolute inset-0 z-[100] bg-[#0a0a0c] animate-in fade-in zoom-in-95 duration-200">
              <Terminal
                projectId={repoFullName || 'default'}
                fileToSync={activeTab ? { path: activeTab.id, content: activeTab.content } : null}
                onClose={() => setIsTerminalOpen(false)}
                isMaximized={true}
                onMaximizeToggle={() => setIsTerminalMaximized(false)}
                problems={diagnostics}
                onProblemClick={(path, line) => {
                  handleFileClick(path);
                  setIsTerminalMaximized(false);
                }}
              />
           </div>
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

        
        <div className="mt-auto pb-4 flex flex-col items-center space-y-4">
          <div className="w-8 h-px bg-white/5 mx-auto" />
          
          {/* Advanced Tools Toggle */}
          <button 
            onClick={() => setShowAdvancedTools(!showAdvancedTools)} 
            className="p-1.5 rounded-md text-textSecondary hover:text-white hover:bg-white/5 transition-all flex flex-col items-center gap-1"
            title={showAdvancedTools ? "Hide Advanced Tools" : "Show Advanced Tools"}
          >
            {showAdvancedTools ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">Tools</span>
          </button>

          {showAdvancedTools && (
            <div className="flex flex-col items-center space-y-4 animate-in slide-in-from-bottom duration-300">
              <button onClick={() => setActiveView(v => v === 'analysis' ? null : 'analysis')} className={`p-2 rounded-lg transition-all ${activeView === 'analysis' ? 'bg-highlight/10 text-highlight shadow-[0_0_10px_rgba(255,222,89,0.2)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="AI Analysis"><CheckSquare size={22} /></button>
              <button onClick={() => setActiveView(v => v === 'audit' ? null : 'audit')} className={`p-2 rounded-lg transition-all ${activeView === 'audit' ? 'bg-highlight/10 text-highlight shadow-[0_0_10px_rgba(255,222,89,0.2)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="Quality Audit"><ShieldCheck size={22} /></button>
              <button
                onClick={() => handleFileClick('codeshield://debug')}
                className={`p-4 transition-all relative group ${activeTabId === 'codeshield://debug' ? 'text-red-500' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                title="Neural Debugger"
              >
                <Bug size={18} />
              </button>
              <button onClick={() => setActiveView(v => v === 'env' ? null : 'env')} className={`p-2 rounded-lg transition-all ${activeView === 'env' ? 'bg-highlight/10 text-highlight shadow-[0_0_10px_rgba(255,222,89,0.2)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="Environment Variables"><Key size={22} /></button>
            </div>
          )}

          <div className="w-8 h-px bg-white/5 mx-auto" />

          <button onClick={() => setIsTerminalOpen(!isTerminalOpen)} className={`p-2 rounded-lg transition-all ${isTerminalOpen ? 'bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.3)]' : 'text-textSecondary hover:text-white hover:bg-white/5'}`} title="Terminal">
            <SquareTerminal size={22} />
          </button>
        </div>
      </div>

      <DiscardConfirmationModal 
        isOpen={isDiscardModalOpen} 
        onClose={() => setIsDiscardModalOpen(false)} 
        onConfirm={() => {
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: t.originalContent } : t));
          setIsDiscardModalOpen(false);
          handleNotify('Changes discarded.', 'info');
        }} 
      />

      {/* 🔮 Diagnostic Notification */}
      <Snackbar 
        open={diagnosticOpen} 
        autoHideDuration={10000} 
        onClose={() => setDiagnosticOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        className="mb-12"
      >
        <Alert 
            severity="warning" 
            onClose={() => setDiagnosticOpen(false)}
            variant="filled"
            sx={{ width: '100%', bgcolor: '#facc15', color: '#000' }}
            action={
              <button 
                onClick={handleApplyDiagnostic}
                className="ml-4 px-3 py-1 bg-black text-white text-[10px] font-bold uppercase rounded hover:bg-black/80 transition-all"
              >
                Fix Now
              </button>
            }
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[11px] uppercase tracking-wider">{lastDiagnostic?.type?.replace('_', ' ')} detected</span>
            <span className="text-[10px] opacity-80">{lastDiagnostic?.message}</span>
          </div>
        </Alert>
      </Snackbar>

      <Snackbar 
        open={notifications.length > 0} 
        autoHideDuration={6000} 
        onClose={() => setNotifications(prev => prev.slice(1))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={notifications[0]?.severity || 'info'} 
          variant="filled" 
          onClose={() => setNotifications(prev => prev.slice(1))}
          sx={{ borderRadius: '12px', fontWeight: 'bold' }}
        >
            {notifications[0]?.message}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={nodeModulesMissing && !nodeModulesDismissed} 
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="warning" 
          variant="filled" 
          onClose={() => setNodeModulesDismissed(true)}
          sx={{ 
            borderRadius: '12px', 
            fontWeight: 'bold',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          Session Restored: Dependencies Missing. Run 'npm install' to start your app.
        </Alert>
      </Snackbar>

      <UnsavedChangesModal 
        isOpen={!!tabToClose}
        fileName={tabs.find(t => t.id === tabToClose)?.name || ''}
        onClose={() => setTabToClose(null)}
        onDiscard={() => {
            if (tabToClose) forceCloseTab(tabToClose);
        }}
        onSave={async () => {
            if (tabToClose) {
                // We need to temporarily set the tab to close as active to reuse handleSave
                // or just call save logic directly
                const tab = tabs.find(t => t.id === tabToClose);
                if (tab && socket) {
                    socket.emit('sync-file', { filePath: tab.id, content: tab.content });
                    await OPFSStorage.writeFile(tab.id, tab.content);
                    forceCloseTab(tabToClose);
                    handleNotify(`Saved and closed ${tab.name}`, 'success');
                }
            }
        }}
      />

      {/* 🚢 Professional Port Discovery Toast (Codeanywhere Style) */}
      <Snackbar 
        open={!!portNotice} 
        autoHideDuration={15000} 
        onClose={() => setPortNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        className="mb-4 ml-4"
      >
        <Alert 
          severity="info" 
          variant="filled"
          onClose={() => setPortNotice(null)}
          sx={{ 
            bgcolor: '#1e1e2e', 
            color: '#fff',
            border: '1px solid #3178c6',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            '& .MuiAlert-icon': { color: '#3178c6' }
          }}
          action={
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                      if (portNotice) window.open(portNotice.url, '_blank');
                      setPortNotice(null);
                  }}
                  className="px-3 py-1 bg-[#3178c6] text-white text-[10px] font-bold uppercase rounded hover:bg-[#215a9e] transition-all flex items-center gap-1.5"
                >
                  Open in Browser <ExternalLink size={10} />
                </button>
                <button 
                  onClick={() => {
                      if (portNotice) {
                          navigator.clipboard.writeText(portNotice.url);
                          handleNotify(`URL for port ${portNotice.port} copied!`, 'success');
                      }
                      setPortNotice(null);
                  }}
                  className="px-3 py-1 bg-white/5 text-white/80 text-[10px] font-bold uppercase rounded hover:bg-white/10 transition-all"
                >
                  Copy
                </button>
            </div>
          }
        >
          <div className="flex flex-col gap-0.5 pr-4">
            <span className="font-bold text-[11px] uppercase tracking-wider text-[#3178c6]">Port {portNotice?.port} is now available</span>
            <span className="text-[10px] opacity-70">CodeShield has generated a professional preview for your app.</span>
          </div>
        </Alert>
      </Snackbar>
    </div>
  );
};

export default EditorPage;
