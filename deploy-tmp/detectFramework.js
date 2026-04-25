const fs = require('fs');
const path = require('path');

/**
 * Detects the framework and configuration of a project based on package.json
 * @param {string} projectPath 
 */
function detectFramework(projectPath) {
    const pkgPath = path.join(projectPath, 'package.json');
    
    // Default fallback
    const fallback = { 
        name: 'Unknown', 
        port: 3000, 
        cmd: 'npm start', 
        type: 'unknown', 
        hasDatabase: false 
    };

    if (!fs.existsSync(pkgPath)) return fallback;

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        const hasDatabase = !!(
            deps['prisma'] || 
            deps['drizzle-orm'] || 
            deps['pg'] || 
            deps['mongoose'] || 
            deps['@prisma/client'] ||
            deps['sequelize']
        );

        if (deps['next']) {
            return { name: 'Next.js', port: 3001, cmd: 'npm dev', type: 'fullstack', hasDatabase };
        }
        if (deps['vite']) {
            return { name: 'Vite', port: 5173, cmd: 'npm run dev', type: 'frontend', hasDatabase };
        }
        if (deps['react-scripts']) {
            return { name: 'CRA', port: 3000, cmd: 'npm start', type: 'frontend', hasDatabase };
        }
        if (deps['nuxt']) {
            return { name: 'Nuxt', port: 3000, cmd: 'npm run dev', type: 'fullstack', hasDatabase };
        }
        if (deps['@sveltejs/kit']) {
            return { name: 'SvelteKit', port: 5173, cmd: 'npm run dev', type: 'fullstack', hasDatabase };
        }
        if (deps['express']) {
            return { name: 'Express', port: 5000, cmd: 'node index.js', type: 'backend', hasDatabase };
        }
        if (deps['fastify']) {
            return { name: 'Fastify', port: 3000, cmd: 'node index.js', type: 'backend', hasDatabase };
        }
        if (deps['@nestjs/core']) {
            return { name: 'NestJS', port: 3000, cmd: 'npm run start:dev', type: 'backend', hasDatabase };
        }

        // Generic fallback for unknown Node projects
        return { 
            name: pkg.name || 'Node.js', 
            port: 3000, 
            cmd: pkg.scripts?.start ? 'npm start' : 'node index.js', 
            type: 'node', 
            hasDatabase 
        };
    } catch (e) {
        return fallback;
    }
}

module.exports = { detectFramework };
