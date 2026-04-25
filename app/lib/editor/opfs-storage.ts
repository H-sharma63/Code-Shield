/**
 * OPFS Storage Utility
 * High-performance browser-native file system operations using the Origin Private File System.
 */

export class OPFSStorage {
  private static root: FileSystemDirectoryHandle | null = null;

  /**
   * Initializes and returns the root directory handle of the OPFS.
   */
  static async getRoot(): Promise<FileSystemDirectoryHandle> {
    if (!this.root) {
      this.root = await navigator.storage.getDirectory();
    }
    return this.root;
  }

  /**
   * Writes a file to the OPFS. Creates parent directories if they don't exist.
   */
  static async writeFile(path: string, content: string | Uint8Array | Blob): Promise<void> {
    const root = await this.getRoot();
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    let currentDir = root;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content as any);
    await writable.close();
  }

  /**
   * Reads a file from the OPFS as text.
   */
  static async readFile(path: string): Promise<string> {
    const root = await this.getRoot();
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    let currentDir = root;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part);
    }

    const fileHandle = await currentDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  }

  /**
   * Reads a file from the OPFS as a Uint8Array (binary).
   */
  static async readFileAsBuffer(path: string): Promise<Uint8Array> {
    const root = await this.getRoot();
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    let currentDir = root;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part);
    }

    const fileHandle = await currentDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Recursively retrieves all files and their contents from the OPFS.
   * Returns a Record where the key is the full path and the value is the content.
   */
  static async getAllFiles(): Promise<Record<string, Uint8Array>> {
    const files: Record<string, Uint8Array> = {};
    const root = await this.getRoot();

    const traverse = async (dirHandle: FileSystemDirectoryHandle, currentPath: string = '') => {
      try {
        for await (const [name, handle] of (dirHandle as any).entries()) {
          const path = currentPath ? `${currentPath}/${name}` : name;
          try {
            if (handle.kind === 'file') {
              const file = await handle.getFile();
              const buffer = await file.arrayBuffer();
              files[path] = new Uint8Array(buffer);
            } else if (handle.kind === 'directory') {
              await traverse(handle as FileSystemDirectoryHandle, path);
            }
          } catch (e) {
            // Handle cases where file is deleted during traversal
            console.warn(`Skipping file during traversal: ${path}`, e);
          }
        }
      } catch (e) {
        console.warn(`Skipping directory during traversal: ${currentPath}`, e);
      }
    };

    await traverse(root);
    return files;
  }

  /**
   * Deletes a file or directory from the OPFS.
   */
  static async deleteEntry(path: string, recursive: boolean = false): Promise<void> {
    const root = await this.getRoot();
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop()!;
    let currentDir = root;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part);
    }

    await currentDir.removeEntry(name, { recursive });
  }

  /**
   * Checks if a file exists in the OPFS.
   */
  static async exists(path: string): Promise<boolean> {
    try {
      const root = await this.getRoot();
      const parts = path.split('/').filter(Boolean);
      const fileName = parts.pop()!;
      let currentDir = root;

      for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part);
      }

      await currentDir.getFileHandle(fileName);
      return true;
    } catch {
      return false;
    }
  }
}
