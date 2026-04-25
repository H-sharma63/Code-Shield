# Remote App Runner with Hybrid Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Headless IDE" architecture where Monaco is the frontend intelligence and GCP handles execution and type generation, connected via WebSockets.

**Architecture:** 
1. Replace WebContainers with `socket.io-client` in `WorkspaceContext.tsx` to connect to the GCP `terminal-backend`.
2. Add a debounced `sync-file` WebSocket event from Monaco to GCP to handle real-time file synchronization without `git clone`.
3. Add a type-scanning script on GCP that emits `sync-types` events after `npm install` finishes, which the frontend intercepts to feed `monaco.languages.typescript.typescriptDefaults.addExtraLib()`, hybridizing with existing ATA.
4. Integrate the public URLs emitted by the GCP tunneling service into the frontend preview iframe.

**Tech Stack:** React, Next.js, Socket.IO, Monaco Editor, TypeScript, Node.js.

---

### Task 1: Refactor GCP Workspace Manager (Backend)

**Files:**
- Modify: `terminal-backend/lib/workspace-manager.js:1-74`
- Modify: `terminal-backend/server.js:50-160`

- [ ] **Step 1: Remove `git clone` logic from `workspace-manager.js`**

```javascript
const path = require('path');
const fs = require('fs');
const os = require('os');

// Store workspaces in the user's home directory for persistence
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.join(os.homedir(), 'codeshield-workspaces');

function sanitize(input) {
    if (!input || typeof input !== 'string') return 'default';
    const clean = input.replace(/[^a-zA-Z0-9-_]/g, '');
    return clean || 'default';
}

function isValidGitUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /^https:\/\/|^git@/.test(url);
}

async function getProjectPath(owner, repo, repoUrl, token) {
    const safeOwner = sanitize(owner);
    const safeRepo = sanitize(repo);
    
    const projectPath = path.resolve(WORKSPACE_ROOT, safeOwner, safeRepo);
    
    if (!projectPath.startsWith(path.resolve(WORKSPACE_ROOT))) {
        throw new Error('Path traversal attempt detected');
    }

    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
    }

    // Git clone logic removed. The frontend will push the files.

    return projectPath;
}

module.exports = { getProjectPath, WORKSPACE_ROOT, sanitize, isValidGitUrl };
```

- [ ] **Step 2: Add `sync-file` and `sync-types` logic to `server.js`**

```javascript
// ... existing imports ...
const fs = require('fs');

// ... inside io.on('connection', async (socket) => { ...

    // Real-time file sync from Monaco
    socket.on('sync-file', ({ filePath, content }) => {
        try {
            // Ensure the path is safe
            const safeRelativePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
            const fullPath = path.join(projectPath, safeRelativePath);
            
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(fullPath, content, 'utf8');
        } catch (err) {
            console.error(`[SYNC ERROR] Failed to write ${filePath}:`, err.message);
        }
    });

    // Bulk File Sync from Frontend (Initial Load)
    socket.on('bulk-sync', ({ files }) => {
        try {
             files.forEach(file => {
                 const safeRelativePath = path.normalize(file.path).replace(/^(\.\.[\/\\])+/, '');
                 const fullPath = path.join(projectPath, safeRelativePath);
                 
                 const dir = path.dirname(fullPath);
                 if (!fs.existsSync(dir)) {
                     fs.mkdirSync(dir, { recursive: true });
                 }
                 
                 fs.writeFileSync(fullPath, file.content, 'utf8');
             });
             socket.emit('output', `\r\n\x1b[32m✔\x1b[0m \x1b[1mWorkspace Synced to GCP:\x1b[0m ${files.length} files transferred.\r\n`);
        } catch (err) {
             console.error(`[BULK SYNC ERROR]`, err.message);
        }
    });

    // Scan for local types and push to Monaco
    socket.on('request-types', () => {
        const typesDir = path.join(projectPath, '.next', 'types');
        if (!fs.existsSync(typesDir)) return;

        // Basic recursive read (can be optimized later)
        const getFiles = (dir, files = []) => {
            const list = fs.readdirSync(dir);
            for (const file of list) {
                const name = dir + '/' + file;
                if (fs.statSync(name).isDirectory()) {
                    getFiles(name, files);
                } else if (name.endsWith('.d.ts')) {
                    files.push(name);
                }
            }
            return files;
        };

        try {
            const dtsFiles = getFiles(typesDir);
            const definitions = dtsFiles.map(file => ({
                path: file.replace(projectPath, '').replace(/^\//, ''), // relative path
                content: fs.readFileSync(file, 'utf8')
            }));

            if (definitions.length > 0) {
                socket.emit('sync-types', { definitions });
                socket.emit('output', `\r\n\x1b[36mℹ\x1b[0m \x1b[1mType Definitions Synced:\x1b[0m ${definitions.length} local types pushed to editor.\r\n`);
            }
        } catch(err) {
             console.error("Type scan error:", err);
        }
    });
// ... rest of server.js
```

### Task 2: Connect Frontend `WorkspaceContext` to GCP WebSocket

**Files:**
- Modify: `app/components/editor/WorkspaceContext.tsx`

- [ ] **Step 1: Replace WebContainers with Socket.IO**

```typescript
// Replace WebContainer logic with Socket.IO connection in WorkspaceContext.tsx

// Remove WebContainer imports
// import type { WebContainer, WebContainerProcess } from '@webcontainer/api';

// Add Socket type to context
interface WorkspaceContextType {
  // webcontainer: WebContainer | null; // Removed
  socket: Socket | null;
  // ... rest of context
}

// In the Provider:
const [socket, setSocket] = useState<Socket | null>(null);

const boot = useCallback(async () => {
    if (bootStatusRef.current !== 'idle') return;
    bootStatusRef.current = 'booting';
    setBootStatus('booting');

    try {
        // Connect to GCP Terminal Backend
        // Use environment variable or fallback to localhost for dev
        const gcpUrl = process.env.NEXT_PUBLIC_GCP_URL || 'ws://34.173.124.42:8080'; 
        
        // You would typically get owner/repo from the URL or state
        const queryParams = {
            owner: 'demo', // Hardcoded for now, should be dynamic
            repo: 'demo-repo',
            sessionId: Math.random().toString(36).substring(7)
        };

        const newSocket = io(gcpUrl, { query: queryParams });

        newSocket.on('connect', () => {
             console.log('Connected to GCP Terminal Backend');
             setSocket(newSocket);
             bootStatusRef.current = 'ready';
             setBootStatus('ready');
        });

        newSocket.on('public-url', (data: { port: number, url: string, provider: string }) => {
             setServerUrl(data.url);
             setServerUrls(prev => ({ ...prev, [data.port]: data.url }));
        });
        
        newSocket.on('connect_error', (err) => {
             console.error("GCP Connection Error:", err);
             setError(err.message);
             bootStatusRef.current = 'error';
             setBootStatus('error');
        });

    } catch (err: any) {
      console.error("Fatal boot error:", err);
      setError(err.message);
      bootStatusRef.current = 'error';
      setBootStatus('error');
    }
}, []);
```

### Task 3: Implement Initial Bulk Sync & Real-time File Sync

**Files:**
- Modify: `app/components/editor/WorkspaceContext.tsx`

- [ ] **Step 1: Implement `syncProject` to use WebSocket `bulk-sync`**

```typescript
  const syncProject = useCallback(async (projectId: string) => {
    if (!socket || isSyncing || lastSyncedProjectId.current === projectId) return;
    setIsSyncing(true);
    try {
      const treeRes = await fetch(`/api/github/contents?repo=${encodeURIComponent(projectId)}`);
      if (!treeRes.ok) throw new Error('Failed to fetch project tree');

      const data = await treeRes.json();
      const items = data.items || [];
      
      const filesToSync: {path: string, content: string}[] = [];

      for (const item of items.filter((item: any) => item.type === 'file')) {
          try {
            const res = await fetch(`/api/github/contents?repo=${encodeURIComponent(projectId)}&path=${encodeURIComponent(item.path)}`);
            const fileData = await res.json();
            if (fileData.item?.content) {
              const content = atob(fileData.item.content.replace(/\n/g, ''));
              filesToSync.push({ path: item.path, content });
              await persistFile(item.path, content); // Keep local OPFS cache
            }
          } catch (e) { }
      }
      
      // Push all files to GCP
      socket.emit('bulk-sync', { files: filesToSync });
      
      const allFiles = await OPFSStorage.getAllFiles();
      const currentPaths = Object.keys(allFiles).filter(p => !p.startsWith('.shield/') && !p.includes('node_modules/'));
      await ShieldSyncEngine.snapshot(currentPaths);
      
      lastSyncedProjectId.current = projectId;
    } finally { setIsSyncing(false); }
  }, [socket, isSyncing, persistFile]);
```

- [ ] **Step 2: Implement Real-time Sync via `socket.emit('sync-file')`**

```typescript
  // Replace the webcontainer.fs.watch logic with a simple OPFS observer or editor hook
  // In your editor component (e.g. Editor.tsx or wherever Monaco is), when a file changes:
  // 
  // const handleEditorChange = debounce((value: string, path: string) => {
  //    if (socket) {
  //        socket.emit('sync-file', { filePath: path, content: value });
  //    }
  // }, 1500);
```

### Task 4: Hybrid Type Integration in Monaco

**Files:**
- Modify: `app/components/editor/Editor.tsx` (or wherever Monaco is instantiated/configured)

- [ ] **Step 1: Listen for `sync-types` and inject into Monaco**

```typescript
  // Assuming you have access to `socket` and `monaco` instance
  
  useEffect(() => {
      if (!socket || !monaco) return;

      const handleTypesSync = ({ definitions }: { definitions: {path: string, content: string}[] }) => {
          definitions.forEach(def => {
              // Inject GCP-generated types into Monaco
              monaco.languages.typescript.typescriptDefaults.addExtraLib(
                  def.content,
                  `file:///workspace/${def.path}` // Adjust path format as needed
              );
          });
      };

      socket.on('sync-types', handleTypesSync);
      
      // Periodically request types after user might have run npm install/build
      const typeInterval = setInterval(() => {
          socket.emit('request-types');
      }, 30000); // Every 30 seconds

      return () => {
          socket.off('sync-types', handleTypesSync);
          clearInterval(typeInterval);
      };
  }, [socket, monaco]);
```

---
