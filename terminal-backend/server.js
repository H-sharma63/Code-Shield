const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');
const pty = require('node-pty');
const cors = require('cors');
const { detectFramework } = require('./detectFramework');
const { getProjectPath, sanitize } = require('./lib/workspace-manager');
const { getListeningPorts } = require('./lib/port-observer');
const { createTunnel } = require('./lib/tunnel-manager');
const { rewriteOutput } = require('./lib/output-rewriter');

const app = express();
app.use(cors());

app.get('/health', (req, res) => res.status(200).send('CodeShield Terminal Engine: Online'));

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e8 // 100MB for bulk syncs
});

// 📊 GLOBAL ENGINE STATS
const activeSessions = new Map();

app.get('/stats', (req, res) => {
    const memFree = os.freemem();
    const memTotal = os.totalmem();
    const cpuLoad = os.loadavg();
    
    const sessionsList = Array.from(activeSessions.values()).map(s => {
        let resources = { cpu: '0.0', mem: '0.0' };
        try {
            const stats = execSync(`ps -p ${s.pid} -o %cpu,%mem --no-headers`).toString().trim().split(/\s+/);
            if (stats.length >= 2) {
                resources = { cpu: stats[0] + '%', mem: stats[1] + '%' };
            }
        } catch (e) {}

        return {
            sessionId: s.sessionId,
            owner: s.owner,
            repo: s.repo,
            repoFullName: s.repoFullName || `${s.owner}/${s.repo}`,
            cwd: s.cwd,
            startTime: s.startTime,
            pid: s.pid,
            resources
        };
    });

    let diskUsage = '0%';
    try {
        diskUsage = execSync("df -h / --output=pcent | tail -1").toString().trim();
    } catch (e) {}

    res.json({
        engine: {
            uptime: process.uptime(),
            memFree,
            memTotal,
            cpuLoad,
            diskUsage,
            memory: {
                free: memFree,
                total: memTotal,
                usage: ((memTotal - memFree) / memTotal * 100).toFixed(2) + '%'
            },
            cpu: {
                load1m: cpuLoad[0].toFixed(2),
                load5m: cpuLoad[1].toFixed(2),
                load15m: cpuLoad[2].toFixed(2)
            }
        },
        sessions: sessionsList
    });
});

const PORT = process.env.PORT || 8080;
console.log(`\x1b[35m--- CODESHIELD NATIVE TERMINAL ENGINE ---\x1b[0m`);

io.on('connection', async (socket) => {
    const { owner, repo, repoUrl, token, sessionId } = socket.handshake.query;
    const actualSessionId = sessionId || 'default';
    const actualOwner = owner && owner !== 'undefined' ? owner : 'demo';
    const actualRepo = repo && repo !== 'undefined' ? repo : 'project';
    
    // Parse incoming custom environment variables
    let customEnv = {};
    try {
        if (socket.handshake.query.env) {
            customEnv = JSON.parse(socket.handshake.query.env);
        }
    } catch (e) {
        console.warn(`[CONN] Failed to parse custom env for ${actualSessionId}`);
    }
    
    console.log(`\x1b[34m[CONN] User: ${actualOwner}, Repo: ${actualRepo}, Session: ${actualSessionId}\x1b[0m`);

    // --- VS CODE BRIDGE ROUTER ---
    if (actualSessionId === 'vscode-bridge') {
        console.log(`\x1b[35m[BRIDGE] VS Code Extension connected to router.\x1b[0m`);
        
        socket.on('vscode-active-file', (data) => {
            // Broadcast to all connected Next.js frontends
            socket.broadcast.emit('vscode-active-file', data);
        });

        socket.on('vscode-active-content', (data) => {
            socket.broadcast.emit('vscode-active-content', data);
        });

        socket.on('vscode-cursor', (data) => {
            socket.broadcast.emit('vscode-cursor', data);
        });

        socket.on('disconnect', () => {
            console.log(`\x1b[31m[BRIDGE] VS Code Extension disconnected.\x1b[0m`);
        });
        
        // Stop execution here so we don't spawn a PTY shell for the bridge
        return;
    }

    // --- FRONTEND ROUTER ---
    // If a frontend sends a fix, broadcast it to the bridge
    socket.on('vscode-apply-fix', (data) => {
        socket.broadcast.emit('vscode-apply-fix', data);
    });

    let projectPath;
    let projectExists = false;
    try {
        const safeOwner = sanitize(actualOwner);
        const safeRepo = sanitize(actualRepo);
        const WORKSPACE_ROOT = path.join(os.homedir(), 'codeshield-workspaces');
        const expectedPath = path.resolve(WORKSPACE_ROOT, safeOwner, safeRepo);
        
        // Check if path exists and has more than 2 files (. and .. don't count)
        if (fs.existsSync(expectedPath)) {
            const files = await fs.promises.readdir(expectedPath);
            if (files.length > 0) {
                projectExists = true;
            }
        }

        projectPath = await getProjectPath(actualOwner, actualRepo, repoUrl, token);
        console.log(`\x1b[32m[PATH] Workspace set to: ${projectPath} (Exists: ${projectExists})\x1b[0m`);
    } catch (err) {
        socket.emit('output', `\r\n\x1b[41;37m [ ERROR ] \x1b[0m ${err.message}\r\n`);
        socket.disconnect();
        return;
    }

    const activeTunnels = new Map();
    console.log(`\x1b[32m✅ IDE Connected [Session: ${actualSessionId}]\x1b[0m`);
    
    // Notify frontend if project is already on disk
    socket.emit('session-ready', { projectExists });

    const manageTunnelForPort = async (port) => {
        const portInt = parseInt(port);
        const ALLOWED_PORTS = [3000, 3001, 5173, 5174, 8000, 8081, 4200];
        if (!ALLOWED_PORTS.includes(portInt)) return;

        const existingTunnel = activeTunnels.get(port);
        if (existingTunnel && existingTunnel.status === 'active') return;

        console.log(`\x1b[36m🌐 [BACKEND] Direct access available for Port ${port}\x1b[0m`);
        
        const gcpIp = process.env.GCP_IP || '34.10.151.8'; 
        const directUrl = `http://${gcpIp}:${port}`;
        
        activeTunnels.set(port, { status: 'active', provider: 'gcp-direct', url: directUrl });
        console.log(`\x1b[32m🌍 [PREVIEW READY] Direct URL: ${directUrl}\x1b[0m`);
        socket.emit('public-url', { port: portInt, url: directUrl, provider: 'gcp-direct' });
    };

    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
    
    console.log(`\x1b[34m[PTY] Spawning ${shell} in ${projectPath}\x1b[0m`);

    const ptyProcess = pty.spawn(shell, ['-i'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: projectPath,
        env: { ...process.env, ...customEnv, TERM: 'xterm-256color', HOST: '0.0.0.0' }
    });

    // Register active session
    activeSessions.set(ptyProcess.pid, {
        pid: ptyProcess.pid,
        sessionId: actualSessionId,
        owner: actualOwner,
        repo: actualRepo,
        repoFullName: `${actualOwner}/${actualRepo}`,
        cwd: projectPath,
        startTime: new Date().toISOString()
    });

    // Restore professional colored PS1 prompt
    const ps1Command = `export PS1="\\[\\e[32m\\]codeshield\\[\\e[0m\\]:\\[\\e[34m\\]\\w\\[\\e[0m\\]\\$ "`;

    // Write the setup commands directly to the shell
    ptyProcess.write(ps1Command + '\r');
    ptyProcess.write(`cd "${projectPath}"\r`);
    ptyProcess.write('clear\r');

    socket.emit('output', '\r\n\x1b[33m--- CodeShield V8 Shell Initialized ---\x1b[0m\r\n');

    ptyProcess.onData(data => {
        // High-performance rewrite: Catch common ports immediately even before scanner hits
        let out = data.toString();
        const gcpIp = process.env.GCP_IP || '34.10.151.8';
        const COMMON_PORTS = [3000, 3001, 5173, 8000, 8080];
        
        COMMON_PORTS.forEach(p => {
            const regex = new RegExp(`http://(?:localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|10\\.128\\.0\\.4|\\[?::\\]?):${p}\\b`, 'g');
            if (regex.test(out)) {
                out = out.replace(regex, `http://${gcpIp}:${p}`);
                // If we hit a match, manually trigger tunnel management for that port
                manageTunnelForPort(p);
            }
        });

        // Also run the dynamic rewriter for any other tunnels
        out = rewriteOutput(out, activeTunnels);
        socket.emit('output', out);
    });

    // Speed up port scanning to catch fast startup logs (500ms instead of 3000ms)
    const portInterval = setInterval(() => getListeningPorts(ports => ports.forEach(manageTunnelForPort)), 500);

    socket.on('input', data => {
        ptyProcess.write(data);
    });

    // Helper to safely write base64 files
    const writeBase64File = async (absolutePath, base64Content) => {
        const buffer = Buffer.from(base64Content, 'base64');
        await fs.promises.writeFile(absolutePath, buffer);
    };

    // Robust individual file sync
    socket.on('sync-file', async ({ filePath, content, encoding }) => {
        try {
            const absolutePath = path.resolve(projectPath, filePath);
            if (!absolutePath.startsWith(projectPath)) {
                console.warn(`[SYNC] Traversal attempt blocked: ${filePath}`);
                return;
            }
            
            await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
            
            if (encoding === 'base64') {
                await writeBase64File(absolutePath, content);
            } else {
                await fs.promises.writeFile(absolutePath, content, 'utf8');
            }
            console.log(`\x1b[34m📄 File Synced: ${filePath}\x1b[0m`);
        } catch (err) {
            console.error(`[SYNC] Error for ${filePath}:`, err.message);
        }
    });

    // Robust bulk file sync
    socket.on('bulk-sync', async ({ files }) => {
        console.log(`\x1b[34m📦 Bulk Sync: Received ${files.length} files\x1b[0m`);
        try {
            let count = 0;
            for (const file of files) {
                const absolutePath = path.resolve(projectPath, file.path);
                if (!absolutePath.startsWith(projectPath)) continue;
                
                await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });

                if (file.encoding === 'base64') {
                     await writeBase64File(absolutePath, file.content);
                } else {
                     await fs.promises.writeFile(absolutePath, file.content, 'utf8');
                }
                count++;
            }
            console.log(`\x1b[32m✅ Bulk Sync: ${count} files written to disk\x1b[0m`);
            socket.emit('output', `
\x1b[32m[SYSTEM] Workspace synced: ${count} files loaded.\x1b[0m
`);
            socket.emit('sync-complete');
        } catch (err) {
            console.error("[SYNC] Bulk error:", err.message);
            socket.emit('sync-error', { message: err.message });
        }
    });

    socket.on('disconnect', () => {
        console.log(`\x1b[31m❌ IDE Disconnected [Session: ${actualSessionId}]\x1b[0m`);
        clearInterval(portInterval);
        activeTunnels.forEach(tunnel => tunnel.process?.kill());
        activeTunnels.clear();
        activeSessions.delete(ptyProcess.pid);
        ptyProcess.kill();
    });

    ptyProcess.onExit(({ exitCode }) => {
        socket.emit('output', `
\x1b[41;37m[SHELL TERMINATED]\x1b[0m Code: ${exitCode}
`);
        socket.emit('session-closed', { sessionId: actualSessionId });
    });
});

server.listen(PORT, '0.0.0.0', () => console.log(`\x1b[32m✅ Terminal Engine listening on ${PORT}\x1b[0m`));
