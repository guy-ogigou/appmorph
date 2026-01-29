import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { AppmorphProjectConfig } from '@appmorph/shared';

export interface AppConfig {
  port: number;
  host: string;
  projectPath: string;
  agent: {
    type: 'claude-cli';
    command: string;
  };
}

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Load and validate configuration from environment variables.
 * Exits the process with helpful error messages if configuration is invalid.
 */
export function loadConfig(): AppConfig {
  const errors: ValidationError[] = [];

  // Port and host (optional with defaults)
  const port = parseInt(process.env.PORT || '3002', 10);
  const host = process.env.HOST || '0.0.0.0';

  // Project path (required, but has a default for development)
  let projectPath = process.env.APPMORPH_PROJECT_PATH;

  if (!projectPath) {
    // Default to examples/demo-app relative to the monorepo root
    const defaultPath = resolve(process.cwd(), 'examples/demo-app');
    if (existsSync(defaultPath)) {
      projectPath = defaultPath;
      console.log(`Using default project path: ${projectPath}`);
    } else {
      // Try relative to packages/core
      const altPath = resolve(process.cwd(), '../../examples/demo-app');
      if (existsSync(altPath)) {
        projectPath = altPath;
        console.log(`Using default project path: ${projectPath}`);
      } else {
        errors.push({
          field: 'APPMORPH_PROJECT_PATH',
          message: 'Project path not specified and default path not found. Set APPMORPH_PROJECT_PATH environment variable.',
        });
      }
    }
  } else {
    // Resolve relative paths
    projectPath = resolve(process.cwd(), projectPath);
    if (!existsSync(projectPath)) {
      errors.push({
        field: 'APPMORPH_PROJECT_PATH',
        message: `Project path does not exist: ${projectPath}`,
      });
    }
  }

  // Agent configuration
  const agentType = (process.env.APPMORPH_AGENT_TYPE || 'claude-cli') as 'claude-cli';
  const claudeCommand = process.env.APPMORPH_CLAUDE_COMMAND || 'claude';

  // Validate Claude CLI is available
  if (agentType === 'claude-cli') {
    try {
      execSync(`which ${claudeCommand}`, { stdio: 'pipe' });
    } catch {
      errors.push({
        field: 'APPMORPH_CLAUDE_COMMAND',
        message: `Claude CLI not found. Make sure '${claudeCommand}' is installed and in your PATH. Install with: npm install -g @anthropic-ai/claude-code`,
      });
    }
  }

  // Exit with errors if any
  if (errors.length > 0) {
    console.error('\n❌ Configuration Error\n');
    console.error('The following configuration issues were found:\n');

    for (const error of errors) {
      console.error(`  • ${error.field}: ${error.message}`);
    }

    console.error('\nRequired environment variables:');
    console.error('  APPMORPH_PROJECT_PATH  - Path to the project folder to modify');
    console.error('\nOptional environment variables:');
    console.error('  PORT                   - Server port (default: 3002)');
    console.error('  HOST                   - Server host (default: 0.0.0.0)');
    console.error('  APPMORPH_AGENT_TYPE    - Agent type (default: claude-cli)');
    console.error('  APPMORPH_CLAUDE_COMMAND - Claude CLI command (default: claude)');
    console.error('');

    process.exit(1);
  }

  return {
    port,
    host,
    projectPath: projectPath!,
    agent: {
      type: agentType,
      command: claudeCommand,
    },
  };
}

// Singleton config instance
let configInstance: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

// ============================================
// Project Config (appmorph.json)
// ============================================

let projectConfigInstance: AppmorphProjectConfig | null = null;

/**
 * Find appmorph.json by searching upward from the starting directory.
 */
function findAppmorphConfig(startPath: string): string | null {
  let currentPath = startPath;

  while (true) {
    const configPath = resolve(currentPath, 'appmorph.json');
    if (existsSync(configPath)) {
      return configPath;
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      // Reached filesystem root
      return null;
    }
    currentPath = parentPath;
  }
}

/**
 * Load and validate appmorph.json configuration file.
 * Searches upward from cwd to find the config file.
 * This is mandatory - fails startup if missing or invalid.
 */
export function loadAppmorphProjectConfig(basePath?: string): AppmorphProjectConfig {
  const searchPath = basePath || process.cwd();
  const configPath = findAppmorphConfig(searchPath);

  if (!configPath) {
    console.error('\n❌ Configuration Error\n');
    console.error('appmorph.json not found. This file is required.');
    console.error(`\nSearched upward from: ${searchPath}`);
    console.error('\nCreate an appmorph.json file in your project root with the following structure:');
    console.error(`
{
  "source_type": "file_system",
  "source_location": "./path/to/source",
  "build_command": "npm run build -- --outDir <dist>",
  "deploy_type": "file_system",
  "deploy_root": "./deploy"
}
`);
    process.exit(1);
  }

  console.log(`Found appmorph.json at: ${configPath}`);

  let config: AppmorphProjectConfig;
  try {
    const content = readFileSync(configPath, 'utf-8');
    config = JSON.parse(content) as AppmorphProjectConfig;
  } catch (error) {
    console.error('\n❌ Configuration Error\n');
    console.error(`Failed to parse appmorph.json: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Validate required fields
  const errors: string[] = [];

  if (config.source_type !== 'file_system') {
    errors.push('source_type must be "file_system"');
  }

  if (!config.source_location) {
    errors.push('source_location is required');
  }

  if (!config.build_command) {
    errors.push('build_command is required');
  } else if (!config.build_command.includes('<dist>')) {
    errors.push('build_command must contain <dist> placeholder');
  }

  if (config.deploy_type !== 'file_system') {
    errors.push('deploy_type must be "file_system"');
  }

  if (!config.deploy_root) {
    errors.push('deploy_root is required');
  }

  if (errors.length > 0) {
    console.error('\n❌ Configuration Error\n');
    console.error('appmorph.json validation failed:\n');
    for (const error of errors) {
      console.error(`  • ${error}`);
    }
    process.exit(1);
  }

  // Resolve relative paths to absolute
  const configDir = dirname(configPath);
  config.source_location = resolve(configDir, config.source_location);
  config.deploy_root = resolve(configDir, config.deploy_root);

  // Validate source location exists
  if (!existsSync(config.source_location)) {
    console.error('\n❌ Configuration Error\n');
    console.error(`source_location does not exist: ${config.source_location}`);
    process.exit(1);
  }

  return config;
}

export function getAppmorphProjectConfig(): AppmorphProjectConfig {
  if (!projectConfigInstance) {
    projectConfigInstance = loadAppmorphProjectConfig();
  }
  return projectConfigInstance;
}
