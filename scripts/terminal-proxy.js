const { WebSocketServer } = require('ws');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http'); // 🔐 Add HTTP for Cloudflare health-checks

const PORT = 3001;
const PROJECTS_ROOT = path.join(__dirname, '..', '..'); 

// 🛰️ CREATE A DUAL-PURPOSE SERVER (HTTP + WEBSOCKET)
const server = http.createServer((req, res) => {
    // Standard health-check for Cloudflare Tunnels
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('CodeShield Smart Agent: ONLINE\n');
});

const wss = new WebSocketServer({ server }); // Attach WSS to our new HTTP server
console.log(`\x1b[35m--- CODESHIELD CLOUDFLARE-READY PROXY ---\x1b[0m`);

wss.on('connection', (ws) => {
  console.log('\x1b[32m✅ IDE Connected to Terminal Proxy\x1b[0m');

  let shell = null;
  let currentCwd = path.join(__dirname, '..'); 

  const startShell = (targetCwd) => {
    if (shell) shell.kill();
    const finalCwd = targetCwd || currentCwd;
    shell = spawn('cmd.exe', ['/Q', '/K'], {
      cwd: finalCwd,
      env: { ...process.env }, 
      shell: false
    });
    console.log(`\x1b[36m🛰️ SHELL STARTED IN: ${finalCwd}\x1b[0m`);
    shell.stdout.on('data', (data) => ws.readyState === 1 && ws.send(data));
    shell.stderr.on('data', (data) => ws.readyState === 1 && ws.send(data));
  };

  startShell();

  ws.on('message', (message) => {
    try {
        const payload = JSON.parse(message.toString());
        if (payload.type === 'INIT_PROJECT') {
            const projectFolderName = payload.projectId ? payload.projectId.split('/').pop() : null;
            if (projectFolderName) {
                const potentialPath = path.join(PROJECTS_ROOT, projectFolderName);
                if (fs.existsSync(potentialPath)) {
                    currentCwd = potentialPath;
                    startShell(currentCwd);
                    ws.send(`\r\n\x1b[32m🛰️ JUMPED TO PROJECT: ${projectFolderName}\x1b[0m\r\n`);
                }
            }
            return;
        }
        if (payload.type === 'FILE_SYNC') {
            const fullPath = path.join(currentCwd, payload.path);
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(fullPath, payload.content);
            return;
        }
        if (payload.type === 'INPUT') {
            let data = payload.data;
            if (data === '\x03') { // Ctrl+C
                exec(`taskkill /F /T /PID ${shell.pid}`, () => {
                    startShell();
                    ws.send('\r\n\x1b[31m[COMMAND TERMINATED BY CTRL+C]\x1b[0m\r\n');
                });
                return;
            }
            if (data === '\r') data = '\r\n';
            if (shell && shell.stdin.writable) shell.stdin.write(data);
        }
    } catch (e) {
        let data = message.toString();
        if (shell && shell.stdin.writable) shell.stdin.write(data);
    }
  });

  ws.on('close', () => {
    if (shell) shell.kill();
    console.log('\x1b[31m❌ IDE Disconnected.\x1b[0m');
  });
});

// 🔥 LAUNCH SERVER
server.listen(PORT, () => {
    console.log(`\x1b[32m✅ Smart Agent Listening on Port ${PORT}\x1b[0m`);
    console.log(`\x1b[33m🚀 Ready for Cloudflare Tunnel Connection\x1b[0m`);
});
