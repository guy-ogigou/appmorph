import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Repository/Project manager interface.
 * For the initial prototype, this works with local folders.
 * Will be extended to support git operations in the future.
 */
export interface RepoManager {
  /** Get the project root path */
  getProjectPath(): string;

  /** Check if the project path exists and is valid */
  validate(): boolean;

  /** List files in the project (excluding node_modules, etc.) */
  listFiles(subPath?: string): string[];

  /** Get a file path relative to the project root */
  getFilePath(relativePath: string): string;

  /** Check if a file exists in the project */
  fileExists(relativePath: string): boolean;
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.cache',
]);

const IGNORED_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
]);

export class FolderRepoManager implements RepoManager {
  constructor(private projectPath: string) {}

  getProjectPath(): string {
    return this.projectPath;
  }

  validate(): boolean {
    if (!existsSync(this.projectPath)) {
      return false;
    }
    const stat = statSync(this.projectPath);
    return stat.isDirectory();
  }

  listFiles(subPath?: string): string[] {
    const basePath = subPath ? join(this.projectPath, subPath) : this.projectPath;
    const files: string[] = [];

    const walk = (dir: string) => {
      if (!existsSync(dir)) return;

      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name) || IGNORED_FILES.has(entry.name)) {
          continue;
        }

        const fullPath = join(dir, entry.name);
        const relativePath = relative(this.projectPath, fullPath);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          files.push(relativePath);
        }
      }
    };

    walk(basePath);
    return files.sort();
  }

  getFilePath(relativePath: string): string {
    return join(this.projectPath, relativePath);
  }

  fileExists(relativePath: string): boolean {
    return existsSync(this.getFilePath(relativePath));
  }
}

// Singleton instance
let repoManagerInstance: RepoManager | null = null;

export function initRepoManager(projectPath: string): RepoManager {
  repoManagerInstance = new FolderRepoManager(projectPath);
  return repoManagerInstance;
}

export function getRepoManager(): RepoManager {
  if (!repoManagerInstance) {
    throw new Error('RepoManager not initialized. Call initRepoManager first.');
  }
  return repoManagerInstance;
}
