function rewriteOutput(data, activeTunnels) {
    let text = data.toString();
    
    // activeTunnels is a Map where key = port, value = { provider, url, process }
    for (const [port, tunnelInfo] of activeTunnels.entries()) {
        if (tunnelInfo && tunnelInfo.url && tunnelInfo.status === 'active') {
            // Match http://localhost:PORT, http://127.0.0.1:PORT, http://0.0.0.0:PORT, http://10.x.x.x:PORT, etc.
            // Support both IPv4 and IPv6 [::] formats
            const urlRegex = new RegExp(`http://(?:localhost|(?:\\\\d{1,3}\\\\.){3}\\\\d{1,3}|\\\\[?::\\\\]?):${port}\\\\b`, 'g');
            text = text.replace(urlRegex, tunnelInfo.url);
        }
    }
    
    return text;
}

module.exports = { rewriteOutput };
