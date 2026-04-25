import { OPFSStorage } from './opfs-storage';

export interface ChangedFile {
  name: string;
  path: string;
  status: 'modified' | 'added' | 'deleted';
}

/**
 * ShieldSyncEngine
 * 
 * Manages the persistent change tracking between the user's workspace
 * and the "clean" snapshots stored in OPFS.
 */
export const ShieldSyncEngine = {
  /**
   * Identifies all changed files in the project by comparing active files
   * with the snapshots in .shield/base/
   */
  async getChanges(): Promise<ChangedFile[]> {
    const changes: ChangedFile[] = [];
    
    try {
      // 1. Get all active files (excluding hidden .shield folder and massive node_modules)
      const allFiles = await OPFSStorage.getAllFiles();
      const activeFiles = Object.keys(allFiles).filter(p => !p.startsWith('.shield/') && !p.includes('node_modules/'));
      
      // 2. Get all base snapshot files
      const baseFiles = activeFiles.filter(p => true); 
      
      // 3. Detect Modified and Added
      // 🚀 PERFORMANCE: Limit iterations to avoid blocking main thread
      const MAX_CHANGES_PER_TICK = 500;
      let count = 0;

      for (const path of activeFiles) {
        if (count++ > MAX_CHANGES_PER_TICK) break;
        const basePath = `.shield/base/${path}`;
        const activeContent = allFiles[path];
        const baseContent = allFiles[basePath];

        if (baseContent === undefined) {
          // File exists in active but NOT in base -> ADDED
          changes.push({
            name: path.split('/').pop() || path,
            path,
            status: 'added'
          });
        } else {
          // Compare content
          const isModified = await this.compareContent(activeContent, baseContent);
          if (isModified) {
            changes.push({
              name: path.split('/').pop() || path,
              path,
              status: 'modified'
            });
          }
        }
      }

      // 4. Detect Deleted
      // We need to list all base files to see if any are missing in active
      const allBasePaths = Object.keys(allFiles)
        .filter(p => p.startsWith('.shield/base/'))
        .map(p => p.replace('.shield/base/', ''));

      for (const basePathOrg of allBasePaths) {
        if (!allFiles[basePathOrg]) {
          changes.push({
            name: basePathOrg.split('/').pop() || basePathOrg,
            path: basePathOrg,
            status: 'deleted'
          });
        }
      }

    } catch (e) {
      console.error("Failed to detect changes:", e);
    }

    return changes;
  },

  /**
   * Simple content comparison
   */
  async compareContent(a: string | Uint8Array, b: string | Uint8Array): Promise<boolean> {
    if (typeof a === 'string' && typeof b === 'string') {
        return a !== b;
    }
    
    // For Uint8Array (binary files)
    if (a instanceof Uint8Array && b instanceof Uint8Array) {
        if (a.length !== b.length) return true;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return true;
        }
        return false;
    }

    return true; // Type mismatch or unknown
  },

  /**
   * After a successful commit, update the base snapshots to match the new state
   */
  async snapshot(paths: string[]) {
    const allFiles = await OPFSStorage.getAllFiles();
    for (const path of paths) {
        if (allFiles[path]) {
            await OPFSStorage.writeFile(`.shield/base/${path}`, allFiles[path]);
        }
    }
  }
};
