const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { spawn, exec } = require('child_process');
const cors = require('cors');
const { detectFramework } = require('./detectFramework');
const { getProjectPath } = require('./lib/workspace-manager');

const app = express();
app.use(cors());

// Health check for Cloudflare/Railway
app.get('/health', (req, res) => {
    res.status(200).send('CodeShield Terminal Engine: Online');
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for production once Vercel URL is known
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 8080;
console.log(`\x1b[35m--- CODESHIELD NATIVE TERMINAL ENGINE ---\x1b[0m`);

io.on('connection', (socket) => {
    const { owner, repo, sessionId } = socket.handshake.query;
    const projectPath = getProjectPath(owner || 'default', repo || 'temp');
    const actualSessionId = sessionId || 'default';

    const activeTunnels = new Map();

    console.log(`\x1b[32m✅ IDE Connected [Session: ${actualSessionId}]\x1b[0m`);

    // Detect framework for the welcome message
    const framework = detectFramework(projectPath);

    // Spawn the Process (No PTY)
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
    const shellArgs = process.platform === 'win32' ? ['/Q', '/K'] : [];
    
    const ptyProcess = spawn(shell, shellArgs, {
        cwd: projectPath,
        env: {
            ...process.env,
            CODESHIELD_SESSION: actualSessionId,
            PORT: String(framework.port),
            TERM: 'xterm-256color'
        },
        shell: false
    });

    // Send Welcome Message
    const welcome = `\r\n\x1b[45;37m ⚡ CODESHIELD NATIVE ENGINE (LITE) \x1b[0m\r\n` +
                  `   \x1b[1;32mDetected:\x1b[0m ${framework.name}\r\n` +
                  `   \x1b[1;32mDefault Port:\x1b[0m ${framework.port}\r\n` +
                  `   \x1b[1;32mRun Command:\x1b[0m ${framework.cmd}\r\n\r\n`;
    
    socket.emit('output', welcome);

    const handleData = (data) => {
        const output = data.toString();
        socket.emit('output', output);

        // 🔍 Simple Port Discovery Logic
        const portMatch = output.match(/(?:localhost|0\.0\.0\.0|127\.0\.0\.1):(\d+)/);
        if (portMatch) {
            const port = portMatch[1];
            if (!activeTunnels.has(port)) {
                console.log(`\x1b[36m🔌 Detecting Server on Port ${port}. Spawning Tunnel...\x1b[0m`);
                activeTunnels.set(port, true);

                const tunnel = spawn('npx', ['-y', 'localtunnel', '--port', port]);
                
                tunnel.stdout.on('data', (tData) => {
                    const tOutput = tData.toString();
                    if (tOutput.includes('your url is:')) {
                        const publicUrl = tOutput.split(/your url is:/i)[1]?.trim();
                        if (publicUrl) {
                            console.log(`\x1b[32m🌍 Public Preview: ${publicUrl}\x1b[0m`);
                            socket.emit('public-url', { port: parseInt(port), url: publicUrl });
                            socket.emit('output', `\r\n\x1b[42;37m 🚀 CODESHIELD NATIVE PREVIEW \x1b[0m \x1b[1;32mYour app is live at:\x1b[0m \x1b[4;34m${publicUrl}\x1b[0m\r\n\r\n`);
                        }
                    }
                });

                tunnel.on('close', () => activeTunnels.delete(port));
            }
        }
    };

    ptyProcess.stdout.on('data', handleData);
    ptyProcess.stderr.on('data', handleData);

    // Stream Client input to Process
    socket.on('input', (data) => {
        if (ptyProcess && ptyProcess.stdin.writable) {
            // Handle Ctrl+C
            if (data === '\x03' && process.platform === 'win32') {
                exec(`taskkill /F /T /PID ${ptyProcess.pid}`);
                return;
            }
            ptyProcess.stdin.write(data);
        }
    });

    // Handle Resize (No-op for spawn)
    socket.on('resize', () => {
        // Not supported by standard spawn
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
        console.log(`\x1b[31m❌ IDE Disconnected [Session: ${actualSessionId}]\x1b[0m`);
        if (process.platform === 'win32') {
            exec(`taskkill /F /T /PID ${ptyProcess.pid}`);
        } else {
            ptyProcess.kill();
        }
    });

    // Handle process exit
    ptyProcess.on('exit', (exitCode) => {
        console.log(`\x1b[33m⚠️ Shell Process Exited [Code: ${exitCode}]\x1b[0m`);
        socket.emit('output', `\r\n\x1b[41;37m [ SHELL TERMINATED ] \x1b[0m Exit Code: ${exitCode}\r\n`);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\x1b[32m✅ Terminal Engine listening on port ${PORT}\x1b[0m`);
    console.log(`\x1b[33m🚀 Ready for Railway Deployment\x1b[0m`);
});
