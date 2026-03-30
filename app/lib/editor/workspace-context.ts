import { Tab } from '@/app/components/editor/TabBar';

/**
 * Workspace Context Engine
 * This utility bundles multiple files from the current workspace
 * to provide project-wide context to the AI.
 */

export interface ProjectFile {
    path: string;
    content: string;
}

export const BLOCKED_EXTENSIONS = [
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'pdf', 'zip', 'tar', 'gz', 
    'mp4', 'mov', 'avi', 'mp3', 'wav', 'woff', 'woff2', 'ttf', 'eot'
];

export const BLOCKED_DIRS = [
    'node_modules', '.git', '.next', 'dist', 'build', '.vscode', '.github'
];

/**
 * Bundles provided files into a single formatted context string.
 * @param files Array of file objects with path and content
 * @returns A single string formatted for AI consumption
 */
export function bundleProjectContext(files: ProjectFile[]): string {
    if (files.length === 0) return "";

    let context = "--- PROJECT WORKSPACE CONTEXT ---\n";
    context += "The following files are part of the current project workspace. Use these to understand cross-file dependencies and architecture.\n\n";

    files.forEach(file => {
        context += `--- FILE: ${file.path} ---\n`;
        context += file.content;
        context += "\n--- END ---\n\n";
    });

    context += "--- END OF PROJECT CONTEXT ---";
    return context;
}

/**
 * Checks if a file path should be included in the analysis context.
 */
export function isAnalysisCandidate(path: string): boolean {
    const parts = path.split('/');
    if (parts.some(p => BLOCKED_DIRS.includes(p))) return false;

    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext || BLOCKED_EXTENSIONS.includes(ext)) return false;

    return true;
}

/**
 * Creates a context bundle from the currently open tabs.
 */
export function getContextFromTabs(tabs: Tab[]): string {
    const candidates = tabs
        .filter(tab => isAnalysisCandidate(tab.id))
        .map(tab => ({ path: tab.id, content: tab.content }));
    
    return bundleProjectContext(candidates);
}

/**
 * Deep Project Scanner
 * Fetches the entire repository tree and key source files from Server/GitHub.
 */
export async function getDeepProjectContext(repoFullName: string): Promise<string> {
    try {
        // 1. Fetch the entire recursive tree
        const treeRes = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}`);
        const treeData = await treeRes.json();
        
        if (!treeRes.ok || !treeData.items) {
            throw new Error(treeData.message || "Failed to fetch project tree");
        }

        const allItems: any[] = treeData.items;
        
        // 2. Generate a Tree Snapshot for structural context
        let treeSnapshot = "--- PROJECT STRUCTURE SNAPSHOT ---\n";
        allItems.forEach(item => {
            const prefix = item.type === 'dir' ? '[DIR] ' : '[FILE] ';
            treeSnapshot += `${prefix}${item.path}\n`;
        });
        treeSnapshot += "--- END STRUCTURE ---\n\n";

        // 3. Identify and fetch key source files
        const sourceFiles = allItems
            .filter(item => item.type === 'file' && isAnalysisCandidate(item.path))
            .slice(0, 30); // Limit to top 30 files for performance/tokens

        const fileContents = await Promise.all(
            sourceFiles.map(async (file) => {
                try {
                    const res = await fetch(`/api/github/contents?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(file.path)}`);
                    const data = await res.json();
                    if (res.ok && data.item?.content) {
                        return {
                            path: file.path,
                            content: atob(data.item.content.replace(/\n/g, ''))
                        };
                    }
                } catch (e) {
                    console.error(`Failed to fetch ${file.path}:`, e);
                }
                return null;
            })
        );

        const validFiles = fileContents.filter((f): f is ProjectFile => f !== null);
        
        // 4. Combine Snapshot + Content
        return treeSnapshot + bundleProjectContext(validFiles);

    } catch (error: any) {
        console.error("Deep Scan Error:", error.message);
        return `[ERROR] Failed to perform deep scan: ${error.message}`;
    }
}
