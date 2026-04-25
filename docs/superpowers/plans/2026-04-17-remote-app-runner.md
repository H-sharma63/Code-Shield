# Remote App Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent GCP-based execution environment for full-stack apps with automated dynamic tunneling and URL masking.

**Architecture:** A Node.js backend on GCP bridges WebSockets to a local shell. A "Smart Observer" detects open ports and spawns tunnels (Localtunnel/Cloudflare), while an "Output Rewriter" masks local URLs in terminal logs.

**Tech Stack:** Node.js, Socket.io, xterm.js, Localtunnel, Cloudflared, Docker, pnpm.

---

### Task 1: Isolated Workspace & Persistence Setup

**Files:**
- Create: `terminal-backend/lib/workspace-manager.js`
- Modify: `terminal-backend/server.js`

- [ ] **Step 1: Implement Workspace Manager**
Create a utility to ensure repos are cloned into `/workspaces/{owner}/{repo}` and handle path resolution.

```javascript
// terminal-backend/lib/workspace-manager.js
const path = require('path');
const fs = require('fs');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/codeshield/workspaces';

function getProjectPath(owner, repo) {
    const projectPath = path.join(WORKSPACE_ROOT, owner, repo);
    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
    }
    return projectPath;
}

module.exports = { getProjectPath, WORKSPACE_ROOT };
```

- [ ] **Step 2: Update server.js to use Workspace Manager**
Update the connection logic to resolve the project path based on incoming metadata.

```javascript
// terminal-backend/server.js
const { getProjectPath } = require('./lib/workspace-manager');

io.on('connection', (socket) => {
    const { owner, repo } = socket.handshake.query;
    const projectPath = getProjectPath(owner || 'default', repo || 'temp');
    // ... rest of setup
});
```

- [ ] **Step 3: Commit**
```bash
git add terminal-backend/lib/workspace-manager.js terminal-backend/server.js
git commit -m "feat: implement isolated workspace management"
```

---

### Task 2: Smart Port Observer

**Files:**
- Create: `terminal-backend/lib/port-observer.js`
- Modify: `terminal-backend/server.js`

- [ ] **Step 1: Implement Port Observer**
Use `netstat` or a polling mechanism to detect when a port starts listening on the VM.

```javascript
// terminal-backend/lib/port-observer.js
const { exec } = require('child_process');

function getListeningPorts(callback) {
    const cmd = process.platform === 'win32' ? 'netstat -an | findstr LISTENING' : 'ss -lntu';
    exec(cmd, (err, stdout) => {
        if (err) return callback([]);
        const ports = [...stdout.matchAll(/:(\d+)\s/g)].map(m => m[1]);
        callback([...new Set(ports)]);
    });
}

module.exports = { getListeningPorts };
```

- [ ] **Step 2: Integrate Observer into Session Loop**
Start a background interval per session to watch for app ports.

- [ ] **Step 3: Commit**
```bash
git add terminal-backend/lib/port-observer.js terminal-backend/server.js
git commit -m "feat: add smart port observer logic"
```

---

### Task 3: Hybrid Tunnel Manager

**Files:**
- Create: `terminal-backend/lib/tunnel-manager.js`
- Modify: `terminal-backend/server.js`

- [ ] **Step 1: Implement Tunnel Manager**
Handle Localtunnel with Cloudflare fallback.

```javascript
// terminal-backend/lib/tunnel-manager.js
const { spawn } = require('child_process');

async function createTunnel(port, subdomain) {
    return new Promise((resolve) => {
        console.log(`Attempting Localtunnel for ${subdomain}...`);
        const lt = spawn('npx', ['-y', 'localtunnel', '--port', port, '--subdomain', subdomain]);
        
        let resolved = false;
        lt.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('your url is:')) {
                resolved = true;
                resolve(output.split('is:')[1].trim());
            }
        });

        setTimeout(() => {
            if (!resolved) {
                console.log("Localtunnel timed out, falling back to Cloudflare...");
                lt.kill();
                const cf = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://localhost:${port}`]);
                cf.stdout.on('data', (data) => {
                   const match = data.toString().match(/https:\/\/.*\.trycloudflare\.com/);
                   if (match) resolve(match[0]);
                });
            }
        }, 5000);
    });
}

module.exports = { createTunnel };
```

- [ ] **Step 2: Connect Tunnel to Socket events**
When a port is detected, trigger the tunnel and emit `public-url` to the frontend.

- [ ] **Step 3: Commit**
```bash
git add terminal-backend/lib/tunnel-manager.js terminal-backend/server.js
git commit -m "feat: implement hybrid tunnel manager with fallback"
```

---

### Task 4: Output Rewriter (URL Masking)

**Files:**
- Create: `terminal-backend/lib/output-rewriter.js`
- Modify: `terminal-backend/server.js`

- [ ] **Step 1: Implement Stream Interceptor**
Create a regex-based rewriter to swap localhost for the public URL.

```javascript
// terminal-backend/lib/output-rewriter.js
function rewriteOutput(data, publicUrl, port) {
    const text = data.toString();
    const localhostRegex = new RegExp(`(http://(?:localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|192\\.168\\.\\d+\\.\\d+):${port})`, 'g');
    return text.replace(localhostRegex, publicUrl);
}

module.exports = { rewriteOutput };
```

- [ ] **Step 2: Apply Rewriter to stdout Stream**
Update `server.js` to pipe shell output through the rewriter if a tunnel is active.

- [ ] **Step 3: Commit**
```bash
git add terminal-backend/lib/output-rewriter.js terminal-backend/server.js
git commit -m "feat: implement terminal output URL rewriting"
```

---

### Task 5: Final Integration & Cleanup

**Files:**
- Modify: `terminal-backend/package.json`
- Modify: `MAJOR_PROJECT_CHECKLIST.md`

- [ ] **Step 1: Add required dependencies**
Ensure `socket.io`, `express`, and other core libs are in the GCP backend's package.json.

- [ ] **Step 2: Update Progress Checklist**
Mark Terminal and App Runner tasks as completed.

- [ ] **Step 3: Final Commit**
```bash
git add .
git commit -m "chore: finalize remote app runner module"
```
