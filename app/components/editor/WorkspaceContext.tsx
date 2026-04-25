'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Terminal as XTermType } from 'xterm';
import { OPFSStorage } from '@/app/lib/editor/opfs-storage';
import { ShieldSyncEngine, ChangedFile } from '@/app/lib/editor/shield-sync';

export interface TerminalSession {
  id: string;
  terminal: XTermType;
  fitAddon: any;
  name: string;
  hasOutput: boolean;
  socket: Socket;
  isAgent?: boolean;
}

export interface DebugStep {
    line: number;
    function: string;
    file: string;
    variables: Record<string, any>;
    action: string;
}

export interface Diagnostic {
    id: string;
    filePath: string;
    line: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    source: string;
}

interface WorkspaceContextType {
  socket: Socket | null;
  sessions: TerminalSession[];
  activeSessionId: string | null;
  bootStatus: 'idle' | 'booting' | 'ready' | 'error';
  error: string | null;
  serverUrl: string | null;
  serverUrls: Record<number, string>;
  publicUrls: Record<number, string>;
  lastDiagnostic: { type: string; message: string; fix: string } | null;
  setLastDiagnostic: (diag: { type: string; message: string; fix: string } | null) => void;
  diagnostics: Diagnostic[];
  setDiagnostics: React.Dispatch<React.SetStateAction<Diagnostic[]>>;
  nodeModulesMissing: boolean;
  createSession: () => Promise<string | null>;
  setActiveSessionId: (id: string) => void;
  closeSession: (id: string) => void;
  syncProject: (projectId: string, force?: boolean) => Promise<void>;
  persistFile: (path: string, content: string | Uint8Array, skipRemoteSync?: boolean) => Promise<void>;
  isSyncing: boolean;
  isTerminalBusy: boolean;
  syncProgress: number;
  syncStatus: string;
  changedFiles: ChangedFile[];
  refreshChanges: () => Promise<void>;
  syncEnvFile: (envVars: Record<string, string>) => Promise<void>;
  commitChanges: (message: string) => Promise<boolean>;
  mountTerminal: (sessionId: string, container: HTMLDivElement) => void;
  sendCommand: (command: string, sessionId?: string) => void;
  boot: (owner: string, repo: string) => Promise<void>;
  remoteDebugState: {
    active: boolean;
    paused: boolean;
    callStack: any[];
    variables: Record<string, any>;
    currentLine?: number;
    currentFile?: string;
  };
  resumeDebug: () => void;
  stepDebug: () => void;
  // PERSISTENT DEBUG STATE
  debuggerState: {
    steps: DebugStep[];
    logs: any[];
    analysis: any | null;
    currentStepIndex: number;
    isSimulating: boolean;
  };
  setDebuggerState: (state: any) => void;
}

function pTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    ),
  ]);
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [bootStatus, setBootStatus] = useState<'idle' | 'booting' | 'ready' | 'error'>('idle');
  const [serverUrl, setServerUrl] = useState<string | null>(process.env.NEXT_PUBLIC_PREVIEW_URL || null);
  const [serverUrls, setServerUrls] = useState<Record<number, string>>({});
  const [publicUrls, setPublicUrls] = useState<Record<number, string>>({});
  const [lastDiagnostic, setLastDiagnostic] = useState<{ type: string; message: string; fix: string } | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTerminalBusy, setIsTerminalBusy] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [nodeModulesMissing, setNodeModulesMissing] = useState(false); 
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const commandQueue = useRef<string[]>([]);

  const lastSyncedProjectId = useRef<string | null>(null);
  const hasCreatedInitialSession = useRef(false);
  const isWarm = useRef<boolean>(false);
  const sessionsRef = useRef<TerminalSession[]>([]);
  const bootStatusRef = useRef<'idle' | 'booting' | 'ready' | 'error'>('idle');
  const socketRef = useRef<Socket | null>(null);
  const projectInfoRef = useRef<{ owner: string, repo: string } | null>(null);

  const persistFile = useCallback(async (path: string, content: string | Uint8Array, skipRemoteSync = false) => {
    await OPFSStorage.writeFile(path, content);
    
    if (socketRef.current && !skipRemoteSync) {
        let base64: string;
        if (typeof content === 'string') {
            const bytes = new TextEncoder().encode(content);
            base64 = btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
        } else {
            base64 = btoa(Array.from(content).map(b => String.fromCharCode(b)).join(''));
        }
        socketRef.current.emit('sync-file', { filePath: path, content: base64, encoding: 'base64' });
    }
  }, []);

  const closeSession = useCallback((id: string) => {
    const session = sessionsRef.current.find(s => s.id === id);
    if (session) {
      session.terminal.dispose();
      session.socket.disconnect();
    }
    sessionsRef.current = sessionsRef.current.filter(s => s.id !== id);
    setSessions([...sessionsRef.current]);
    
    if (activeSessionId === id) {
      const nextSession = sessionsRef.current[sessionsRef.current.length - 1];
      setActiveSessionId(nextSession ? nextSession.id : null);
    }
  }, [activeSessionId]);
  
  const boot = useCallback(async (owner: string, repo: string) => {
    if (bootStatusRef.current !== 'idle') return;
    
    bootStatusRef.current = 'booting';
    setBootStatus('booting');
    projectInfoRef.current = { owner, repo };

    // This boot-specific socket is for general events, not a specific terminal session.
    const gcpUrl = process.env.NEXT_PUBLIC_GCP_URL || 'ws://34.44.252.138:8080';
    const queryParams = { owner, repo, sessionId: 'control-' + Math.random().toString(36).substring(7) };
    const controlSocket = io(gcpUrl, { query: queryParams, reconnectionAttempts: 3, timeout: 5000 });

    controlSocket.on('connect', () => {
        console.log('🔗 [CONTROL] Connected to GCP Control Socket');
        setSocket(controlSocket);
        socketRef.current = controlSocket;
        bootStatusRef.current = 'ready';
        setBootStatus('ready');
    });

    controlSocket.on('session-ready', ({ projectExists }: { projectExists: boolean }) => {
        isWarm.current = projectExists;
        console.log(`[CONTROL] Project state on disk: ${projectExists ? 'WARM' : 'COLD'}`);
    });

    controlSocket.on('public-url', (data: { port: number, url: string }) => {
        setPublicUrls(prev => ({ ...prev, [data.port]: data.url }));
    });
    
    controlSocket.on('connect_error', (err) => {
        console.error("GCP Connection Error:", err.message);
        setError("Failed to connect to Remote Engine.");
        bootStatusRef.current = 'error';
        setBootStatus('error');
    });

    // 🔴 REMOTE DEBUGGER LISTENERS
    controlSocket.on('debugger:paused', (data: any) => {
        setRemoteDebugState({
            active: true,
            paused: true,
            callStack: data.callStack || [],
            variables: data.variables || {},
            currentLine: data.line,
            currentFile: data.file
        });
    });

    controlSocket.on('debugger:resumed', () => {
        setRemoteDebugState(prev => ({ ...prev, paused: false }));
    });
  }, []);

  const [remoteDebugState, setRemoteDebugState] = useState<{
    active: boolean;
    paused: boolean;
    callStack: any[];
    variables: Record<string, any>;
    currentLine?: number;
    currentFile?: string;
  }>({
    active: false,
    paused: false,
    callStack: [],
    variables: {},
  });

  const [debuggerState, setDebuggerStateInternal] = useState({
    steps: [] as DebugStep[],
    logs: [] as any[],
    analysis: null as any | null,
    currentStepIndex: 0,
    isSimulating: false
  });

  const setDebuggerState = useCallback((newState: any) => {
    setDebuggerStateInternal(prev => ({ ...prev, ...newState }));
  }, []);

  const resumeDebug = useCallback(() => {
    socketRef.current?.emit('debug:resume');
  }, []);

  const stepDebug = useCallback(() => {
    socketRef.current?.emit('debug:step');
  }, []);

  const createSession = useCallback(async (): Promise<string | null> => {
    if (!projectInfoRef.current) {
        console.warn("[Session] Cannot create session, project info not set.");
        return null;
    }
    const win = window as any;

    const { Terminal: XTerm } = await import('xterm');
    const { FitAddon } = await import('xterm-addon-fit');
    const { WebLinksAddon } = await import('xterm-addon-web-links');

    const term = new XTerm({
      theme: { 
        background: '#0a0a0c', 
        foreground: '#f8fafc', 
        cursor: '#818cf8',
        selectionBackground: 'rgba(129, 140, 248, 0.3)',
        black: '#1e293b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      },
      fontFamily: "'Fira Code', 'Cascadia Code', Menlo, monospace",
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      convertEol: true,
    });
    
    // term.write(`Connecting to CodeShield Engine...\r\n`);

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());

    const sessionId = Math.random().toString(36).substring(7);
    
    let envVarsStr = '{}';
    try {
        const repoFullName = `${projectInfoRef.current.owner}/${projectInfoRef.current.repo}`;
        const envRes = await fetch(`/api/github/env?repo=${encodeURIComponent(repoFullName)}`);
        if (envRes.ok) {
            const data = await envRes.json();
            if (data.envVars) envVarsStr = JSON.stringify(data.envVars);
        }
    } catch (e) {
        console.warn("[Session] Failed to fetch env vars", e);
    }

    const gcpUrl = process.env.NEXT_PUBLIC_GCP_URL || 'ws://34.44.252.138:8080'; 
    const sessionSocket = io(gcpUrl, { 
        query: {
            owner: projectInfoRef.current.owner,
            repo: projectInfoRef.current.repo,
            sessionId: sessionId,
            env: envVarsStr
        },
        reconnectionAttempts: 3,
        timeout: 5000
    });

    sessionSocket.on('connect', () => {
        console.log(`[Session ${sessionId}] Socket connected`);
        term.write(`\x1b[32m[OK]\x1b[0m Connection established.\r\n`);
        
        if (envVarsStr !== '{}') {
             try {
                const envObj = JSON.parse(envVarsStr);
                const dotEnvContent = Object.entries(envObj).map(([k, v]) => `${k}=${v}`).join('\n');
                const bytes = new TextEncoder().encode(dotEnvContent);
                const base64 = btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
                sessionSocket.emit('sync-file', { filePath: '.env.local', content: base64, encoding: 'base64' });
            } catch (e) {}
        }
    });

    sessionSocket.on('connect_error', (err) => {
        console.error(`[Session ${sessionId}] Connection Error:`, err.message);
        term.write(`\x1b[41;37m [ FAILED ] \x1b[0m Could not connect to session.\r\n`);
    });

    sessionSocket.on('output', (data: string) => {
        term.write(data);
        
        setSessions(currentSessions => {
            const sessionIndex = currentSessions.findIndex(s => s.id === sessionId);
            if (sessionIndex !== -1 && !currentSessions[sessionIndex].hasOutput) {
                console.log(`[Session ${sessionId}] First output received, setting hasOutput: true`);
                const newSessions = [...currentSessions];
                newSessions[sessionIndex] = { ...newSessions[sessionIndex], hasOutput: true };
                sessionsRef.current = newSessions;
                return newSessions;
            }
            return currentSessions;
        });

        // 🧠 MAGIC SIGNAL DETECTOR: Bridge Terminal to Editor
        if (data.includes('##CODESHIELD_OPEN##')) {
            const pattern = /##CODESHIELD_OPEN##(.*?)##CONTENT##(.*?)##/;
            const match = data.match(pattern);
            if (match) {
                const filePath = match[1];
                const base64Content = match[2];
                try {
                    const content = atob(base64Content);
                    const win = window as any;
                    if (win.__workspaceOpenFile) {
                        win.__workspaceOpenFile(filePath, content);
                    }
                } catch (e) {
                    console.error("[Magic Signal] Failed to decode content", e);
                }
            }
        }
    });
    sessionSocket.on('session-closed', () => closeSession(sessionId));

    // 🚨 SUDO BLOCKER: Track typed input to intercept 'sudo' on Enter
    let currentLineBuffer = '';

    term.onData(data => {
        if (data === '\u0003') {
            sessionSocket.emit('input', '\x03');
            currentLineBuffer = '';
            return;
        }

        // Track backspace
        if (data === '\u007F') {
            currentLineBuffer = currentLineBuffer.slice(0, -1);
            sessionSocket.emit('input', data);
            return;
        }

        // Track Enter key
        if (data === '\r') {
            const trimmed = currentLineBuffer.trim().toLowerCase();
            const isAdmin = projectInfoRef.current?.owner === 'admin';

            currentLineBuffer = '';
            sessionSocket.emit('input', data);
            return;
        }

        currentLineBuffer += data;
        sessionSocket.emit('input', data);
    });

    // 📋 COPY & PASTE SUPPORT
    term.attachCustomKeyEventHandler((e) => {
        // Ctrl+C: Copy if text is selected, otherwise send SIGINT handled by onData
        if (e.ctrlKey && e.key === 'c' && term.hasSelection()) {
            if (e.type === 'keydown') {
                document.execCommand('copy');
            }
            return false; // prevent default (don't send SIGINT)
        }

        // Ctrl+V: Paste from clipboard
        if (e.ctrlKey && e.key === 'v') {
            if (e.type === 'keydown') {
                navigator.clipboard.readText().then(text => {
                    sessionSocket.emit('input', text);
                });
            }
            return false; // prevent default
        }

        return true;
    });

    const newSession: TerminalSession = { 
        id: sessionId, 
        terminal: term, 
        fitAddon: fit, 
        name: `Terminal ${sessionsRef.current.length + 1}`, 
        hasOutput: false, 
        socket: sessionSocket
    };
    sessionsRef.current = [...sessionsRef.current, newSession];
    setSessions(sessionsRef.current);
    
    setActiveSessionId(sessionId);
    
    return sessionId;
  }, [closeSession]);

  const mountTerminal = useCallback((sessionId: string, container: HTMLDivElement) => {
    const session = sessionsRef.current.find(s => s.id === sessionId);
    if (!session) return;
    
    session.terminal.open(container);
    try {
      session.fitAddon.fit();
    } catch (e) { }
    session.terminal.focus();
  }, []);

  const sendCommand = useCallback((command: string, sessionId?: string) => {
    const isAdmin = projectInfoRef.current?.owner === 'admin';
    if (!isAdmin && /^sudo\b/.test(command.trim())) {
        console.warn('[CodeShield] sudo command blocked:', command);
        return;
    }
    
    // Only queue if it's a critical system operation (like initial boot)
    if (isTerminalBusy && !sessionId && bootStatus === 'booting') {
        commandQueue.current.push(command);
        return;
    }

    const sid = sessionId || activeSessionId;
    const session = sessionsRef.current.find(s => s.id === sid) || sessionsRef.current[0];
    
    if (session) {
        session.socket.emit('input', command + '\n');
        if (!sessionId) session.terminal.focus();
    }
  }, [activeSessionId, isTerminalBusy]);

  const syncProject = useCallback(async (projectId: string, force = false): Promise<void> => {
    if (!socketRef.current || isSyncing || (lastSyncedProjectId.current === projectId && !force)) return;
    
    await new Promise(r => setTimeout(r, 1000));
    if (isWarm.current && !force) {
        console.log(`[Sync] Project ${projectId} is WARM. Skipping full sync.`);
        lastSyncedProjectId.current = projectId;
        return;
    }

    setIsSyncing(true);
    setIsTerminalBusy(true);
    setSyncProgress(0);
    setSyncStatus('Fetching file tree...');
    
    return new Promise(async (resolve, reject) => {
        try {
          const treeRes = await fetch(`/api/github/contents?repo=${encodeURIComponent(projectId)}`);
          if (!treeRes.ok) throw new Error('Failed to fetch project tree');

          const data = await treeRes.json();
          const items = data.items || [];
          const CONCURRENCY_LIMIT = 15;
          const fileItems = items.filter((item: any) => item.type === 'file');
          const totalFiles = fileItems.length;
          let filesSynced = 0;
          const syncedPaths = new Set<string>();

          const filesToSync: {path: string, content: string, encoding: string}[] = [];

          for (let i = 0; i < fileItems.length; i += CONCURRENCY_LIMIT) {
            const batch = fileItems.slice(i, i + CONCURRENCY_LIMIT);
            await Promise.all(batch.map(async (item: any) => {
              try {
                if (syncedPaths.has(item.path)) return;
                
                if (item.path === 'types/next-auth.d.ts') return;

                setSyncStatus(`Syncing: ${item.path} (${filesSynced}/${totalFiles})`);
                const res = await pTimeout(fetch(`/api/github/contents?repo=${encodeURIComponent(projectId)}&path=${encodeURIComponent(item.path)}`), 15000);

                const fileData = await res.json();
                if (fileData.item?.content) {
                  const content = fileData.item.content.replace(/\s+/g, ''); 
                  filesToSync.push({ path: item.path, content, encoding: 'base64' });
                  syncedPaths.add(item.path);

                  try {
                    const binString = atob(content);
                    const bytes = new Uint8Array(binString.length);
                    for (let i = 0; i < binString.length; i++) bytes[i] = binString.charCodeAt(i);

                    const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html', '.txt', '.yml', '.yaml'];
                    const isText = textExtensions.some(ext => item.path.endsWith(ext)) || !item.path.includes('.');

                    if (isText) {
                        const decodedText = new TextDecoder().decode(bytes);
                        await persistFile(item.path, decodedText, true);
                    } else {
                        await persistFile(item.path, bytes, true);
                    }
                  } catch (atobErr) {
                    console.error(`[Sync] Failed to decode ${item.path}:`, atobErr);
                  }
                }
              } catch (e) {
                  console.error(`[Sync] Error processing ${item.path}:`, e); 
              } finally {
                  filesSynced++;
                  setSyncProgress(Math.round((filesSynced / totalFiles) * 100));
              }
            }));
          }

          setSyncStatus('Synchronizing with Remote Engine...');
          setSyncProgress(100);

          const term = sessionsRef.current[0]?.terminal;
          
          const onSyncComplete = () => {
              socketRef.current?.off('sync-complete', onSyncComplete);
              socketRef.current?.off('sync-error', onSyncError);
              clearTimeout(syncTimeout);
              term?.write(`\x1b[32m[System] Project synchronized. Terminal ready.\x1b[0m
`);
              lastSyncedProjectId.current = projectId;
              setIsSyncing(false);
              setIsTerminalBusy(false);
              setSyncProgress(0);
              setSyncStatus('');
              commandQueue.current.forEach(cmd => sendCommand(cmd));
              commandQueue.current = [];
              resolve();
          };

          const onSyncError = (err: any) => {
              socketRef.current?.off('sync-complete', onSyncComplete);
              socketRef.current?.off('sync-error', onSyncError);
              clearTimeout(syncTimeout);
              setIsSyncing(false);
              setIsTerminalBusy(false);
              setSyncProgress(0);
              setSyncStatus('');
              reject(new Error(err.message));
          };

          const syncTimeout = setTimeout(() => {
              console.warn('[Sync] Timeout reached. Unlocking.');
              onSyncComplete();
          }, 10000);

          socketRef.current?.on('sync-complete', onSyncComplete);
          socketRef.current?.on('sync-error', onSyncError);
          socketRef.current?.emit('bulk-sync', { files: filesToSync });
          
          const allFiles = await OPFSStorage.getAllFiles();
          const currentPaths = Object.keys(allFiles).filter(p => !p.startsWith('.shield/') && !p.includes('node_modules/'));
          await ShieldSyncEngine.snapshot(currentPaths);
          
        } catch (err) {
          console.error("[Sync] Fatal error:", err);
          setIsSyncing(false);
          setIsTerminalBusy(false);
          setSyncProgress(0);
          setSyncStatus('');
          reject(err);
        }
    });
  }, [isSyncing, persistFile, sendCommand]);
  
  const refreshChanges = useCallback(async () => {
    const changes = await ShieldSyncEngine.getChanges();
    setChangedFiles(changes);
  }, []);

  const syncEnvFile = useCallback(async (envVars: Record<string, string>) => {
    if (!socketRef.current) return;
    try {
        const dotEnvContent = Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join('\n');
        const bytes = new TextEncoder().encode(dotEnvContent);
        const base64 = btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
        socketRef.current.emit('sync-file', { filePath: '.env.local', content: base64, encoding: 'base64' });
    } catch (e) {
        console.error("Failed to manually sync .env.local", e);
    }
  }, []);

  const commitChanges = useCallback(async (message: string): Promise<boolean> => {
    if (!projectInfoRef.current) return false;
    try {
        const changes = await ShieldSyncEngine.getChanges();
        if (changes.length === 0) return false;
        const repoFullName = `${projectInfoRef.current.owner}/${projectInfoRef.current.repo}`;
        const changePayload = await Promise.all(changes.map(async (change) => {
            if (change.status === 'deleted') return { path: change.path, status: 'deleted' };
            const content = await OPFSStorage.readFile(change.path);
            return { path: change.path, content, status: 'added' };
        }));
        const res = await fetch('/api/github/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoFullName, message, changes: changePayload })
        });
        if (!res.ok) throw new Error('Failed to commit');
        const allFiles = await OPFSStorage.getAllFiles();
        const currentPaths = Object.keys(allFiles).filter(p => !p.startsWith('.shield/') && !p.includes('node_modules/'));
        await ShieldSyncEngine.snapshot(currentPaths);
        await refreshChanges();
        return true;
    } catch (e) {
        console.error("[Git] Commit Error:", e);
        return false;
    }
  }, [refreshChanges]);

  useEffect(() => {
    if (bootStatus === 'ready') {
      const interval = setInterval(refreshChanges, 3000);
      refreshChanges();

      // 🕒 Background GitHub Sync: Every 5 minutes
      const githubSyncInterval = setInterval(() => {
          if (projectInfoRef.current && !isSyncing) {
              console.log("[Sync] Triggering periodic GitHub background fetch...");
              const repoFullName = `${projectInfoRef.current.owner}/${projectInfoRef.current.repo}`;
              syncProject(repoFullName, true);
          }
      }, 5 * 60 * 1000);

      return () => {
          clearInterval(interval);
          clearInterval(githubSyncInterval);
      };
    }
  }, [bootStatus, refreshChanges, isSyncing, syncProject]);

  // Global hooks for Admin/External triggers
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const win = window as any;
        win.__workspaceBoot = (owner: string, repo: string) => boot(owner, repo);
        win.__workspaceCreateSession = () => createSession();
        win.__workspaceOpenFile = (path: string, content: string) => {
            persistFile(path, content);
            // This hook will be picked up by the EditorPage component
            const event = new CustomEvent('codeshield-open-file', { detail: { path, content } });
            window.dispatchEvent(event);
        };
        win.__workspaceOpenSplitAgent = (agent: string) => {
            const event = new CustomEvent('codeshield-open-agent', { detail: { agent } });
            window.dispatchEvent(event);
        };
    }
  }, [boot, createSession, persistFile]);

  // Auto-start first session on ready
  useEffect(() => {
    if (bootStatus === 'ready' && !hasCreatedInitialSession.current) {
        hasCreatedInitialSession.current = true;
        createSession();
    }
  }, [bootStatus, createSession]);

  return (
    <WorkspaceContext.Provider value={{
      socket, sessions, activeSessionId, setActiveSessionId, createSession, closeSession,
      bootStatus, error, serverUrl, serverUrls, publicUrls, lastDiagnostic, setLastDiagnostic,
      diagnostics, setDiagnostics,
      nodeModulesMissing, syncProject, persistFile, isSyncing, isTerminalBusy, syncProgress,
      syncStatus, changedFiles, refreshChanges, syncEnvFile, commitChanges, mountTerminal,
      sendCommand, boot, remoteDebugState, resumeDebug, stepDebug, debuggerState, setDebuggerState
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
};
