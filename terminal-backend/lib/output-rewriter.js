function rewriteOutput(data, activeTunnels) {
    let text = data.toString();

    for (const [port, tunnelInfo] of activeTunnels.entries()) {
        if (tunnelInfo && tunnelInfo.url && tunnelInfo.status === 'active') {
            // Very robust regex: catch http:// followed by ANY ip/host, then :PORT
            // This catches localhost, 127.0.0.1, 0.0.0.0, 10.x.x.x, [::], etc.
            const genericUrlRegex = new RegExp(`http://(?:[a-zA-Z0-9\\.\\-:]+|\\[[0-9a-fA-F:]+\\]):${port}\\b`, 'g');
            text = text.replace(genericUrlRegex, tunnelInfo.url);
        }
    }

    return text;
}

module.exports = { rewriteOutput };
