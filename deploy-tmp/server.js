const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const pty = require('node-pty');
const cors = require('cors');
const { detectFramework } = require('./detectFramework');
const { getProjectPath } = require('./lib/workspace-manager');
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

const PORT = process.env.PORT || 8080;
console.log(`\x1b[35m--- CODESHIELD NATIVE TERMINAL ENGINE ---\x1b[0m`);

io.on('connection', async (socket) => {
    const { owner, repo, repoUrl, token, sessionId } = socket.handshake.query;
    const actualSessionId = sessionId || 'default';
    const actualOwner = owner && owner !== 'undefined' ? owner : 'demo';
    const actualRepo = repo && repo !== 'undefined' ? repo : 'project';
    
    console.log(`\x1b[34m[CONN] User: ${actualOwner}, Repo: ${actualRepo}, Session: ${actualSessionId}\x1b[0m`);

    let projectPath;
    try {
        projectPath = await getProjectPath(actualOwner, actualRepo, repoUrl, token);
        console.log(`\x1b[32m[PATH] Workspace set to: ${projectPath}\x1b[0m`);
    } catch (err) {
        socket.emit('output', `
\x1b[41;37m [ ERROR ] \x1b[0m ${err.message}
`);
        socket.disconnect();
        return;
    }

    const activeTunnels = new Map();
    console.log(`\x1b[32m✅ IDE Connected [Session: ${actualSessionId}]\x1b[0m`);

    const manageTunnelForPort = async (port) => {
        const portInt = parseInt(port);
        const ALLOWED_PORTS = [3000, 3001, 5173, 5174, 8000, 8081, 4200];
        if (!ALLOWED_PORTS.includes(portInt)) return;

        const existingTunnel = activeTunnels.get(port);
        if (existingTunnel && (existingTunnel.status === 'active' || existingTunnel.status === 'pending')) return;

        if (existingTunnel?.process) try { existingTunnel.process.kill(); } catch(e) {}

        console.log(`\x1b[36m🔌 [BACKEND] Spawning Tunnel for Port ${port}...\x1b[0m`);
        activeTunnels.set(port, { status: 'pending', lastAttempt: Date.now() });

        try {
            const tunnelInfo = await createTunnel(port, actualSessionId, 'cloudflare');
            if (!tunnelInfo?.url) throw new Error("Tunnel creation failed.");

            const { provider, url, process: tunnelProcess } = tunnelInfo;
            activeTunnels.set(port, { status: 'active', provider, url, process: tunnelProcess, lastAttempt: Date.now() });
            console.log(`\x1b[32m🌍 [TUNNEL READY] ${provider.toUpperCase()}: ${url}\x1b[0m`);
            socket.emit('public-url', { port: portInt, url, provider });

            tunnelProcess.on('close', () => {
                console.log(`\x1b[31m🔌 [TUNNEL CLOSED] Port ${port}\x1b[0m`);
                activeTunnels.set(port, { status: 'closed', lastAttempt: Date.now() });
            });
        } catch (err) {
            console.error(err.message);
            activeTunnels.set(port, { status: 'failed', lastAttempt: Date.now() });
        }
    };

    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
    const customPrompt = `\x1b[32mcodeshield\x1b[0m:\x1b[34m~/${actualOwner}/${actualRepo}\x1b[0m\$ `;

    console.log(`\x1b[34m[PTY] Spawning ${shell} in ${projectPath}\x1b[0m`);

    const ptyProcess = pty.spawn(shell, ['-i'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: projectPath,
        env: { ...process.env, TERM: 'xterm-256color' }
    });

    // Dynamically build the PS1 command using bash's $'...' syntax for ANSI codes
    const ps1Command = `export PS1=$'\\e[32mcodeshield\\e[0m:\\e[34m~/${actualOwner}/${actualRepo}\\e[0m\\$ '`;

    // Write the setup commands directly to the shell
    ptyProcess.write(`${ps1Command}\r`);
    ptyProcess.write(`cd "${projectPath}"\r`);
    ptyProcess.write('clear\r');

    socket.emit('output', '\r\n\x1b[33m--- CodeShield V8 Shell Initialized ---\x1b[0m\r\n');

    ptyProcess.onData(data => {
        const out = rewriteOutput(data, activeTunnels);
        socket.emit('output', out);
    });

    const portInterval = setInterval(() => getListeningPorts(ports => ports.forEach(manageTunnelForPort)), 3000);

    socket.on('input', data => {
        ptyProcess.write(data);
    });

    // Robust individual file sync
    socket.on('sync-file', async ({ filePath, content, encoding }) => {
        try {
            const absolutePath = path.resolve(projectPath, filePath);
            if (!absolutePath.startsWith(projectPath)) {
                console.warn(`[SYNC] Traversal attempt blocked: ${filePath}`);
                return;
            }
            
            await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
            
            let decodedContent = content;
            if (encoding === 'base64') {
                decodedContent = Buffer.from(content, 'base64').toString('utf8');
            }

            await fs.promises.writeFile(absolutePath, decodedContent);
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

                let decodedContent = file.content;
                if (file.encoding === 'base64') {
                    decodedContent = Buffer.from(file.content, 'base64').toString('utf8');
                }

                await fs.promises.writeFile(absolutePath, decodedContent);
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
        ptyProcess.kill();
    });

    ptyProcess.onExit(({ exitCode }) => {
        socket.emit('output', `
\x1b[41;37m[SHELL TERMINATED]\x1b[0m Code: ${exitCode}
`);
    });
});

server.listen(PORT, '0.0.0.0', () => console.log(`\x1b[32m✅ Terminal Engine listening on ${PORT}\x1b[0m`));
