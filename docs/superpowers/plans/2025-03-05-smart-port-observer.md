# Task 2: Smart Port Observer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a periodic port observer to detect when a port starts listening on the VM and integrate it into the session loop.

**Architecture:** Use a polling mechanism with `netstat` or `ss` to identify active listening ports. Maintain a state per session to track already detected ports and prevent duplicate triggers.

**Tech Stack:** Node.js, `child_process.exec`

---

### Task 1: Implement Port Observer Logic

**Files:**
- Create: `terminal-backend/lib/port-observer.js`
- Test: `terminal-backend/__tests__/port-observer.test.js`

- [ ] **Step 1: Create port-observer.js**

```javascript
const { exec } = require('child_process');

/**
 * Gets the list of unique ports currently in LISTENING state.
 * @param {function} callback - Function receiving (ports[])
 */
function getListeningPorts(callback) {
    const cmd = process.platform === 'win32' ? 'netstat -an | findstr LISTENING' : 'ss -lntu';
    exec(cmd, (err, stdout) => {
        if (err) {
            // Silently fail if command fails (e.g. no ports found on some platforms)
            return callback([]);
        }
        
        // Match :PORT followed by whitespace (works for both netstat and ss output patterns)
        const ports = [...stdout.matchAll(/:(\d+)\s/g)].map(m => m[1]);
        
        // Return unique numeric ports
        const uniquePorts = [...new Set(ports.map(p => parseInt(p, 10)))];
        callback(uniquePorts);
    });
}

module.exports = { getListeningPorts };
```

- [ ] **Step 2: Create a unit test with mocked shell output**

```javascript
const { getListeningPorts } = require('../lib/port-observer');
const { exec } = require('child_process');

vi.mock('child_process', () => ({
    exec: vi.fn()
}));

describe('Port Observer', () => {
    it('should parse listening ports on Windows', (done) => {
        const mockOutput = '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING\n' +
                           '  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING\n' +
                           '  TCP    [::]:3000              [::]:0                 LISTENING';
        
        // Mock platform
        Object.defineProperty(process, 'platform', { value: 'win32' });
        
        exec.mockImplementation((cmd, cb) => cb(null, mockOutput));
        
        getListeningPorts((ports) => {
            expect(ports).toContain(135);
            expect(ports).toContain(445);
            expect(ports).toContain(3000);
            expect(ports.length).toBe(3);
            done();
        });
    });

    it('should parse listening ports on Linux', (done) => {
        const mockOutput = 'Netid State      Recv-Q Send-Q Local Address:Port               Peer Address:Port\n' +
                           'tcp   LISTEN     0      128    0.0.0.0:22                  0.0.0.0:*\n' +
                           'tcp   LISTEN     0      128    127.0.0.1:8080               0.0.0.0:*\n' +
                           'tcp   LISTEN     0      128    [::]:3000                   [::]:*';
        
        // Mock platform
        Object.defineProperty(process, 'platform', { value: 'linux' });
        
        exec.mockImplementation((cmd, cb) => cb(null, mockOutput));
        
        getListeningPorts((ports) => {
            expect(ports).toContain(22);
            expect(ports).toContain(8080);
            expect(ports).toContain(3000);
            expect(ports.length).toBe(3);
            done();
        });
    });
});
```

- [ ] **Step 3: Verify tests pass**

Run: `npx vitest terminal-backend/__tests__/port-observer.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add terminal-backend/lib/port-observer.js
git commit -m "feat: implement port observer logic"
```

---

### Task 2: Integrate into Terminal Backend Session Loop

**Files:**
- Modify: `terminal-backend/server.js`

- [ ] **Step 1: Import port observer and set up periodic polling**

Update `server.js` to import `getListeningPorts` and start an interval within the `io.on('connection')` block.

```javascript
// ... existing imports
const { getListeningPorts } = require('./lib/port-observer');

// ... inside io.on('connection', async (socket) => {
    const handledPorts = new Set();
    
    const portCheckInterval = setInterval(() => {
        getListeningPorts((ports) => {
            ports.forEach(port => {
                // Ignore standard or internal ports to reduce noise
                if (port < 1024 || port === 8080) return; 

                if (!handledPorts.has(port)) {
                    console.log(`\x1b[36m🔌 [Session: ${actualSessionId}] New Listening Port Detected: ${port}\x1b[0m`);
                    handledPorts.add(port);
                    
                    // Task 3 will implement tunneling here.
                    // For now, we just log.
                }
            });
        });
    }, 2000); // Poll every 2 seconds
    
    // ... inside socket.on('disconnect', () => {
    clearInterval(portCheckInterval);
```

- [ ] **Step 2: Verify integration (Manual/Mock)**

Since we can't easily start a real server in this environment, verify by reviewing `server.js` changes and ensuring `portCheckInterval` is correctly managed.

- [ ] **Step 3: Commit**

```bash
git add terminal-backend/server.js
git commit -m "feat: integrate port observer into session loop"
```
