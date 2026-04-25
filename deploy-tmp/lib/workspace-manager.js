const path = require('path');
const fs = require('fs');
const os = require('os');

// Default root is /home/Suresh/codeshield-workspaces (mapped to workspaces in project root for local dev if needed)
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.join(os.homedir(), 'codeshield-workspaces');

function sanitize(input) {
    if (!input || typeof input !== 'string') return 'default';
    // Sanitize to alphanumeric, hyphens, and underscores only
    const clean = input.replace(/[^a-zA-Z0-9-_]/g, '');
    return clean || 'default';
}

function isValidGitUrl(url) {
    if (!url || typeof url !== 'string') return false;
    // Basic validation: must start with https:// or git@
    return /^https:\/\/|^git@/.test(url);
}

async function getProjectPath(owner, repo, repoUrl, token) {
    const safeOwner = sanitize(owner);
    const safeRepo = sanitize(repo);

    // Secure path construction
    const projectPath = path.resolve(WORKSPACE_ROOT, safeOwner, safeRepo);

    // Ensure path is still within WORKSPACE_ROOT
    if (!projectPath.startsWith(path.resolve(WORKSPACE_ROOT))) {
        throw new Error('Path traversal attempt detected');
    }

    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
    }

    // Git clone logic removed. The frontend will push the files via bulk-sync.

    return projectPath;
}

module.exports = { getProjectPath, WORKSPACE_ROOT, sanitize, isValidGitUrl };
