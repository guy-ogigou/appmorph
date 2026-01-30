import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { BuildResult, AppmorphProjectConfig } from '@appmorph/shared';

export class FileSystemBuildManager {
  private config: AppmorphProjectConfig;

  constructor(config: AppmorphProjectConfig) {
    this.config = config;
  }

  /**
   * Execute the build command for a session.
   * Replaces <dist> placeholder with deploy_root/sessionId.
   */
  async executeBuild(sessionId: string, stagePath: string): Promise<BuildResult> {
    const deployPath = this.getDeployPath(sessionId);

    // Ensure deploy directory exists
    mkdirSync(deployPath, { recursive: true });

    // Replace <dist> placeholder with actual deploy path
    const buildCommand = this.config.build_command.replace('<dist>', deployPath);

    console.log(`[Build] Executing build command: ${buildCommand}`);
    console.log(`[Build] Working directory: ${stagePath}`);
    console.log(`[Build] Output directory: ${deployPath}`);

    try {
      // First, install dependencies if package.json exists
      // Use npm (not pnpm) because the staged directory is outside the workspace
      // and workspace: deps have been resolved to file: paths by the staging manager
      const packageJsonPath = join(stagePath, 'package.json');
      if (existsSync(packageJsonPath)) {
        console.log(`[Build] Installing dependencies with npm...`);
        execSync('npm install', {
          cwd: stagePath,
          stdio: 'pipe',
          encoding: 'utf-8',
        });
        console.log(`[Build] Dependencies installed`);
      }

      // Execute the build command
      console.log(`[Build] Running: ${buildCommand}`);

      const output = execSync(buildCommand, {
        cwd: stagePath,
        stdio: 'pipe',
        encoding: 'utf-8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      });

      console.log(`[Build] Build completed successfully`);

      return {
        success: true,
        output: output,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Build] Build failed: ${errorMessage}`);

      // Try to extract stdout/stderr from exec error
      let output = '';
      if (error && typeof error === 'object' && 'stdout' in error) {
        output = String((error as { stdout?: unknown }).stdout || '');
      }
      if (error && typeof error === 'object' && 'stderr' in error) {
        output += '\n' + String((error as { stderr?: unknown }).stderr || '');
      }

      return {
        success: false,
        error: errorMessage,
        output: output.trim() || undefined,
      };
    }
  }

  /**
   * Get the deploy path for a session.
   */
  getDeployPath(sessionId: string): string {
    return resolve(this.config.deploy_root, sessionId);
  }
}

// Singleton instance
let buildManager: FileSystemBuildManager | null = null;

export function initBuildManager(config: AppmorphProjectConfig): FileSystemBuildManager {
  buildManager = new FileSystemBuildManager(config);
  return buildManager;
}

export function getBuildManager(): FileSystemBuildManager {
  if (!buildManager) {
    throw new Error('BuildManager not initialized. Call initBuildManager first.');
  }
  return buildManager;
}

/**
 * Reset the build manager singleton (for testing).
 */
export function resetBuildManager(): void {
  buildManager = null;
}
