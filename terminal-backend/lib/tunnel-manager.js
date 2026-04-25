const { spawn } = require('child_process');

/**
 * Creates a tunnel with Cloudflare or Localtunnel.
 * @param {number} port The local port to expose
 * @param {string} sessionId Unique session ID for logging/tracking
 * @param {'cloudflare' | 'localtunnel' | undefined} preferredProvider Optional: Specify a preferred tunnel provider.
 * @returns {Promise<{provider: string, url: string, process: any}>}
 */
async function createTunnel(port, sessionId, preferredProvider) {
    return new Promise((resolve) => {
        let resolved = false;

        // Try Cloudflare first due to better reliability
        const tryCloudflare = () => {
            console.log(`Attempting Cloudflare tunnel for port ${port}...`);
            const cf = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://localhost:${port}`]);

            const cfDataHandler = (data) => {
                const output = data.toString();
                const match = output.match(/https:\/\/.*\.trycloudflare\.com/);
                if (match) {
                    resolved = true;
                    resolve({ provider: 'cloudflare', url: match[0], process: cf });
                }
            };

            cf.stdout.on('data', cfDataHandler);
            cf.stderr.on('data', cfDataHandler); // Cloudflared can output URL to stderr sometimes

            cf.on('close', (code) => {
                if (!resolved) {
                    console.error(`Cloudflare tunnel for port ${port} closed unexpectedly with code ${code}.`);
                }
            });

            setTimeout(() => {
                if (!resolved) {
                    cf.kill();
                    console.log(`Cloudflare tunnel for port ${port} timed out.`);
                    // If cloudflare was the preferred provider, or if localtunnel already failed, don't try localtunnel.
                    if (preferredProvider === 'cloudflare') {
                        resolve(null); // Explicitly resolve null if preferred failed
                    }
                }
            }, 15000); // 15 second timeout for Cloudflare
        };

        // Try Localtunnel as a fallback
        const tryLocaltunnel = () => {
            console.log(`Attempting Localtunnel for port ${port}...`);
            // No custom subdomain for localtunnel for now, as it's flaky.
            const lt = spawn('npx', ['-y', 'localtunnel', '--port', port]);

            const ltDataHandler = (data) => {
                const output = data.toString();
                if (output.includes('your url is:')) {
                    resolved = true;
                    resolve({ provider: 'localtunnel', url: output.split(/your url is:/i)[1].trim(), process: lt });
                }
            };

            lt.stdout.on('data', ltDataHandler);
            lt.stderr.on('data', (data) => {
                console.error(`Localtunnel Error: ${data.toString()}`);
            });

            lt.on('close', (code) => {
                if (!resolved) {
                    console.error(`Localtunnel for port ${port} closed unexpectedly with code ${code}.`);
                }
            });

            setTimeout(() => {
                if (!resolved) {
                    lt.kill();
                    console.log(`Localtunnel for port ${port} timed out.`);
                    resolve(null); // Resolve null if localtunnel also failed
                }
            }, 15000); // 15 second timeout for Localtunnel
        };

        // Execution logic
        if (preferredProvider === 'localtunnel') {
            tryLocaltunnel();
        } else { // Default to Cloudflare, or if preferredProvider is undefined/cloudflare
            tryCloudflare();
            // If Cloudflare fails/times out, the timeout handles calling resolve(null)
            // and then server.js would have to decide to call createTunnel again with localtunnel
            // But for now, we prioritize Cloudflare, and only use localtunnel if explicitly asked or Cloudflare is not present
        }

        // In server.js, createTunnel is now called with preferredProvider: 'cloudflare'
        // If that fails (resolves to null), server.js can then decide to call createTunnel again with 'localtunnel'
    });
}

module.exports = { createTunnel };
