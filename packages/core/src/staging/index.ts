import { existsSync, mkdirSync, cpSync, rmSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { StageInfo, AppmorphProjectConfig } from '@appmorph/shared';

export class FileSystemStagingManager {
  private stageRoot: string;
  private config: AppmorphProjectConfig;
  private monorepoRoot: string | null = null;

  constructor(config: AppmorphProjectConfig) {
    this.config = config;
    // Stage directory is relative to the config file (project root)
    this.stageRoot = resolve(process.cwd(), 'stage');
    this.monorepoRoot = this.findMonorepoRoot();
  }

  /**
   * Find the monorepo root by searching upward for pnpm-workspace.yaml
   */
  private findMonorepoRoot(): string | null {
    let currentPath = process.cwd();

    while (true) {
      const workspaceFile = join(currentPath, 'pnpm-workspace.yaml');
      if (existsSync(workspaceFile)) {
        return currentPath;
      }

      const parentPath = dirname(currentPath);
      if (parentPath === currentPath) {
        return null;
      }
      currentPath = parentPath;
    }
  }

  /**
   * Create a staging directory for a session by copying the source location.
   * Filters out node_modules, .git, and dist directories.
   */
  createStage(sessionId: string): StageInfo {
    const stagePath = this.getStagePath(sessionId);

    // Remove existing stage if it exists
    if (existsSync(stagePath)) {
      console.log(`[Staging] Removing existing stage: ${stagePath}`);
      rmSync(stagePath, { recursive: true, force: true });
    }

    // Create stage directory
    mkdirSync(stagePath, { recursive: true });

    // Copy source to stage, filtering out unwanted directories
    console.log(`[Staging] Copying ${this.config.source_location} to ${stagePath}`);
    this.copyFiltered(this.config.source_location, stagePath);

    // Resolve workspace dependencies in package.json
    this.resolveWorkspaceDependencies(stagePath);

    console.log(`[Staging] Stage created: ${stagePath}`);

    return {
      sessionId,
      stagePath,
    };
  }

  /**
   * Get the path to a session's stage directory.
   */
  getStagePath(sessionId: string): string {
    return resolve(this.stageRoot, sessionId);
  }

  /**
   * Copy files from source to destination, filtering out node_modules, .git, and dist.
   */
  private copyFiltered(source: string, destination: string): void {
    const excludeDirs = new Set(['node_modules', '.git', 'dist', '.next', '.turbo']);

    const copyRecursive = (src: string, dest: string) => {
      const entries = readdirSync(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
          if (excludeDirs.has(entry.name)) {
            // Skip excluded directories
            continue;
          }
          mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else {
          cpSync(srcPath, destPath);
        }
      }
    };

    copyRecursive(source, destination);
  }

  /**
   * Clean up a stage directory.
   */
  cleanupStage(sessionId: string): void {
    const stagePath = this.getStagePath(sessionId);
    if (existsSync(stagePath)) {
      console.log(`[Staging] Cleaning up stage: ${stagePath}`);
      rmSync(stagePath, { recursive: true, force: true });
    }
  }

  /**
   * Create a staging directory for a chained task.
   * If parentSessionId is provided, copies from that session's stage.
   * If parent stage doesn't exist, falls back to the original source (with warning).
   */
  createChainedStage(sessionId: string, parentSessionId: string | null): StageInfo {
    const stagePath = this.getStagePath(sessionId);

    // Remove existing stage if it exists
    if (existsSync(stagePath)) {
      console.log(`[Staging] Removing existing stage: ${stagePath}`);
      rmSync(stagePath, { recursive: true, force: true });
    }

    // Create stage directory
    mkdirSync(stagePath, { recursive: true });

    // Determine source
    let sourceLocation: string;
    let isFromParentStage = false;

    if (parentSessionId) {
      const parentStagePath = this.getStagePath(parentSessionId);
      if (existsSync(parentStagePath)) {
        sourceLocation = parentStagePath;
        isFromParentStage = true;
        console.log(`[Staging] Using parent stage as source: ${parentStagePath}`);
      } else {
        console.warn(
          `[Staging] Parent stage ${parentSessionId} not found, falling back to original source`
        );
        sourceLocation = this.config.source_location;
      }
    } else {
      sourceLocation = this.config.source_location;
    }

    // Copy source to stage, filtering out unwanted directories
    console.log(`[Staging] Copying ${sourceLocation} to ${stagePath}`);
    this.copyFiltered(sourceLocation, stagePath);

    // Only resolve workspace dependencies if copying from original source
    // (parent stage already has resolved dependencies)
    if (!isFromParentStage) {
      this.resolveWorkspaceDependencies(stagePath);
    }

    console.log(`[Staging] Chained stage created: ${stagePath}`);

    return {
      sessionId,
      stagePath,
    };
  }

  /**
   * Resolve workspace:* dependencies in package.json to file: paths.
   * This allows the staged app to install dependencies outside the monorepo context.
   */
  private resolveWorkspaceDependencies(stagePath: string): void {
    const packageJsonPath = join(stagePath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return;
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      let modified = false;

      // Process dependencies and devDependencies
      for (const depType of ['dependencies', 'devDependencies']) {
        const deps = packageJson[depType];
        if (!deps) continue;

        for (const [name, version] of Object.entries(deps)) {
          if (typeof version === 'string' && version.startsWith('workspace:')) {
            const resolvedPath = this.resolveWorkspacePackage(name);
            if (resolvedPath) {
              deps[name] = `file:${resolvedPath}`;
              console.log(`[Staging] Resolved ${name}: workspace:* -> file:${resolvedPath}`);
              modified = true;
            }
          }
        }
      }

      if (modified) {
        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log(`[Staging] Updated package.json with resolved workspace dependencies`);
      }
    } catch (error) {
      console.error(`[Staging] Failed to resolve workspace dependencies: ${error}`);
    }
  }

  /**
   * Resolve a workspace package name to its absolute path.
   */
  private resolveWorkspacePackage(packageName: string): string | null {
    if (!this.monorepoRoot) {
      console.warn(`[Staging] Cannot resolve ${packageName}: monorepo root not found`);
      return null;
    }

    // Common workspace locations
    const possiblePaths = [
      join(this.monorepoRoot, 'packages', packageName.replace('@appmorph/', '')),
      join(this.monorepoRoot, 'plugins', packageName.replace('@appmorph/', '')),
    ];

    for (const pkgPath of possiblePaths) {
      const pkgJsonPath = join(pkgPath, 'package.json');
      if (existsSync(pkgJsonPath)) {
        try {
          const content = readFileSync(pkgJsonPath, 'utf-8');
          const pkgJson = JSON.parse(content);
          if (pkgJson.name === packageName) {
            return pkgPath;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    console.warn(`[Staging] Could not resolve workspace package: ${packageName}`);
    return null;
  }
}

// Singleton instance
let stagingManager: FileSystemStagingManager | null = null;

export function initStagingManager(config: AppmorphProjectConfig): FileSystemStagingManager {
  stagingManager = new FileSystemStagingManager(config);
  return stagingManager;
}

export function getStagingManager(): FileSystemStagingManager {
  if (!stagingManager) {
    throw new Error('StagingManager not initialized. Call initStagingManager first.');
  }
  return stagingManager;
}

/**
 * Reset the staging manager singleton (for testing).
 */
export function resetStagingManager(): void {
  stagingManager = null;
}
