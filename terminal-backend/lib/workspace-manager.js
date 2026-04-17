const path = require('path');
const fs = require('fs');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/codeshield/workspaces';

function getProjectPath(owner, repo) {
    const projectPath = path.join(WORKSPACE_ROOT, owner, repo);
    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
    }
    return projectPath;
}

module.exports = { getProjectPath, WORKSPACE_ROOT };
