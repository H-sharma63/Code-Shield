const { getListeningPorts } = require('../lib/port-observer');
const http = require('http');

async function test() {
    console.log('Running Port Observer Tests...');

    // Test 1: Baseline (No new ports)
    getListeningPorts((ports) => {
        console.log('Initial ports detected:', ports);
        
        // Test 2: Start a dummy server and detect it
        const dummyServer = http.createServer((req, res) => res.end('ok'));
        const DUMMY_PORT = 9999;
        
        dummyServer.listen(DUMMY_PORT, '127.0.0.1', () => {
            console.log(`Started dummy server on port ${DUMMY_PORT}`);
            
            // Give system a moment to update netstat
            setTimeout(() => {
                getListeningPorts((newPorts) => {
                    console.log('New ports detected:', newPorts);
                    if (newPorts.includes(DUMMY_PORT)) {
                        console.log(`  ✅ Successfully detected dummy port ${DUMMY_PORT}`);
                    } else {
                        console.log(`  ❌ Failed to detect dummy port ${DUMMY_PORT}`);
                        process.exit(1);
                    }
                    
                    dummyServer.close(() => {
                        console.log('All tests passed!');
                    });
                });
            }, 1000);
        });
    });
}

test();
