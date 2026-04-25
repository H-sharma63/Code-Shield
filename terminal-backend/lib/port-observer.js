const { exec } = require('child_process');

/**
 * Gets a list of currently listening ports on the system.
 * @param {function} callback - Function called with an array of port strings.
 */
function getListeningPorts(callback) {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'netstat -an | findstr LISTENING' : 'ss -lntu';
    
    exec(cmd, (err, stdout) => {
        if (err) {
            console.error('Error executing port detection command:', err);
            return callback([]);
        }
        
        const ports = [];
        // Windows netstat output:  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING
        // Linux ss output: tcp   LISTEN 0      128      127.0.0.1:8080       0.0.0.0:*
        const regex = isWin 
            ? /(?:(?:\d{1,3}\.){3}\d{1,3}|\[?::\]?|\*):(\d+)\s+.*LISTENING/gi
            : /(?:(?:\d{1,3}\.){3}\d{1,3}|\[?::\]?|\*):(\d+)\s/g;

        let match;
        while ((match = regex.exec(stdout)) !== null) {
            ports.push(parseInt(match[1]));
        }
        
        callback([...new Set(ports)]);
    });
}

module.exports = { getListeningPorts };
