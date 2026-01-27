import { existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

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
