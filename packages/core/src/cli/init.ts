#!/usr/bin/env node

import * as readline from "readline";
import { existsSync, writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    // Try to read from package.json (works in both dev and dist)
    const pkgPath = join(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function showHelp(): void {
  console.log(`
Appmorph CLI - Configuration Setup Wizard

Usage:
  appmorph [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version number

Description:
  This wizard helps you set up Appmorph by creating:
  • appmorph.json - Project configuration (source, build, deploy settings)
  • .env - Environment variables (server, agent, sanitizer settings)

Configuration Parameters:

  appmorph.json:
    source_type       Source type (always "file_system")
    source_location   Path to your source code
    build_command     Build command with <dist> placeholder
    deploy_type       Deploy type (always "file_system")
    deploy_root       Output directory for builds

  .env:
    PORT                    API server port (default: 3002)
    HOST                    Server host (default: 0.0.0.0)
    APPMORPH_PROJECT_PATH   Path to project folder
    APPMORPH_AGENT_TYPE     Agent type (default: claude-cli)
    APPMORPH_CLAUDE_COMMAND Claude CLI command (default: claude)
    OPENAI_API_KEY          OpenAI API key (enables sanitizer)
    OPENAI_MODEL            OpenAI model (default: gpt-4o-mini)
    SANITIZER_INTERVAL_MS   Sanitizer interval in ms (default: 2000)

Examples:
  appmorph           Run the interactive setup wizard
  appmorph --help    Show this help message
`);
}

function parseArgs(): { showHelp: boolean; showVersion: boolean } {
  const args = process.argv.slice(2);
  return {
    showHelp: args.includes("-h") || args.includes("--help"),
    showVersion: args.includes("-v") || args.includes("--version"),
  };
}

interface AppmorphJsonConfig {
  source_type: "file_system";
  source_location: string;
  build_command: string;
  deploy_type: "file_system";
  deploy_root: string;
}

interface EnvConfig {
  PORT: string;
  HOST: string;
  APPMORPH_PROJECT_PATH: string;
  APPMORPH_AGENT_TYPE: string;
  APPMORPH_CLAUDE_COMMAND: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  SANITIZER_INTERVAL_MS: string;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function printHeader(): void {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                    APPMORPH SETUP WIZARD                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
}

function printSection(title: string): void {
  console.log(`\n┌─ ${title} ${"─".repeat(Math.max(0, 55 - title.length))}┐\n`);
}

async function promptWithDefault(
  prompt: string,
  defaultValue: string,
  validator?: (value: string) => string | null
): Promise<string> {
  const defaultDisplay = defaultValue ? ` [${defaultValue}]` : "";
  let value = await question(`  ${prompt}${defaultDisplay}: `);

  if (!value && defaultValue) {
    value = defaultValue;
  }

  if (validator) {
    const error = validator(value);
    if (error) {
      console.log(`  ⚠️  ${error}`);
      return promptWithDefault(prompt, defaultValue, validator);
    }
  }

  return value;
}

async function promptYesNo(prompt: string, defaultYes: boolean = true): Promise<boolean> {
  const defaultDisplay = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await question(`  ${prompt} ${defaultDisplay}: `);

  if (!answer) {
    return defaultYes;
  }

  return answer.toLowerCase().startsWith("y");
}

function validatePath(value: string): string | null {
  if (!value) {
    return "Path cannot be empty";
  }
  return null;
}

function validateBuildCommand(value: string): string | null {
  if (!value) {
    return "Build command cannot be empty";
  }
  if (!value.includes("<dist>")) {
    return "Build command must contain <dist> placeholder";
  }
  return null;
}

function validatePort(value: string): string | null {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return "Port must be a number between 1 and 65535";
  }
  return null;
}

function validateInterval(value: string): string | null {
  const interval = parseInt(value, 10);
  if (isNaN(interval) || interval < 100) {
    return "Interval must be a number >= 100";
  }
  return null;
}

async function collectAppmorphJsonConfig(): Promise<AppmorphJsonConfig> {
  printSection("Project Configuration (appmorph.json)");

  console.log("  These settings define your project source and build process.\n");

  const source_location = await promptWithDefault(
    "Source code location (relative path)",
    "./src",
    validatePath
  );

  const build_command = await promptWithDefault(
    "Build command (use <dist> for output dir)",
    "npm run build -- --outDir <dist>",
    validateBuildCommand
  );

  const deploy_root = await promptWithDefault(
    "Deploy output directory",
    "./deploy",
    validatePath
  );

  return {
    source_type: "file_system",
    source_location,
    build_command,
    deploy_type: "file_system",
    deploy_root,
  };
}

async function collectEnvConfig(): Promise<EnvConfig> {
  printSection("Environment Configuration (.env)");

  console.log("  These settings control the Appmorph server runtime.\n");

  // Server settings
  console.log("  ── Server Settings ──\n");

  const PORT = await promptWithDefault("API server port", "3002", validatePort);

  const HOST = await promptWithDefault("Server host", "0.0.0.0");

  // Project settings
  console.log("\n  ── Project Settings ──\n");

  const APPMORPH_PROJECT_PATH = await promptWithDefault(
    "Project path (or leave for auto-detect)",
    "",
    undefined
  );

  // Agent settings
  console.log("\n  ── Agent Settings ──\n");

  const APPMORPH_AGENT_TYPE = await promptWithDefault(
    "Agent type",
    "claude-cli"
  );

  const APPMORPH_CLAUDE_COMMAND = await promptWithDefault(
    "Claude CLI command",
    "claude"
  );

  // Sanitizer settings (optional)
  console.log("\n  ── Message Sanitizer (Optional) ──\n");
  console.log("  The sanitizer uses OpenAI to provide cleaner status messages.\n");

  const enableSanitizer = await promptYesNo("Enable message sanitizer?", false);

  let OPENAI_API_KEY = "";
  let OPENAI_MODEL = "gpt-4o-mini";
  let SANITIZER_INTERVAL_MS = "2000";

  if (enableSanitizer) {
    OPENAI_API_KEY = await promptWithDefault("OpenAI API key", "", (v) =>
      v ? null : "API key is required to enable sanitizer"
    );

    OPENAI_MODEL = await promptWithDefault("OpenAI model", "gpt-4o-mini");

    SANITIZER_INTERVAL_MS = await promptWithDefault(
      "Sanitizer interval (ms)",
      "2000",
      validateInterval
    );
  }

  return {
    PORT,
    HOST,
    APPMORPH_PROJECT_PATH,
    APPMORPH_AGENT_TYPE,
    APPMORPH_CLAUDE_COMMAND,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    SANITIZER_INTERVAL_MS,
  };
}

function generateAppmorphJson(config: AppmorphJsonConfig): string {
  return JSON.stringify(config, null, 2);
}

function generateEnvFile(config: EnvConfig): string {
  const lines: string[] = [
    "# Appmorph Configuration",
    "# Generated by appmorph init",
    "",
    "# Server Settings",
    `PORT=${config.PORT}`,
    `HOST=${config.HOST}`,
    "",
    "# Project Settings",
  ];

  if (config.APPMORPH_PROJECT_PATH) {
    lines.push(`APPMORPH_PROJECT_PATH=${config.APPMORPH_PROJECT_PATH}`);
  } else {
    lines.push("# APPMORPH_PROJECT_PATH=  # Auto-detected from appmorph.json location");
  }

  lines.push(
    "",
    "# Agent Settings",
    `APPMORPH_AGENT_TYPE=${config.APPMORPH_AGENT_TYPE}`,
    `APPMORPH_CLAUDE_COMMAND=${config.APPMORPH_CLAUDE_COMMAND}`
  );

  if (config.OPENAI_API_KEY) {
    lines.push(
      "",
      "# Message Sanitizer (Optional)",
      `OPENAI_API_KEY=${config.OPENAI_API_KEY}`,
      `OPENAI_MODEL=${config.OPENAI_MODEL}`,
      `SANITIZER_INTERVAL_MS=${config.SANITIZER_INTERVAL_MS}`
    );
  } else {
    lines.push(
      "",
      "# Message Sanitizer (Optional - uncomment to enable)",
      "# OPENAI_API_KEY=",
      "# OPENAI_MODEL=gpt-4o-mini",
      "# SANITIZER_INTERVAL_MS=2000"
    );
  }

  return lines.join("\n") + "\n";
}

function showPreview(appmorphJson: string, envFile: string): void {
  printSection("Preview");

  console.log("  ── appmorph.json ──\n");
  console.log(
    appmorphJson
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n")
  );

  console.log("\n  ── .env ──\n");
  console.log(
    envFile
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n")
  );
}

async function writeFiles(
  outputDir: string,
  appmorphJson: string,
  envFile: string
): Promise<void> {
  const appmorphPath = resolve(outputDir, "appmorph.json");
  const envPath = resolve(outputDir, ".env");

  // Check for existing files
  const existingFiles: string[] = [];
  if (existsSync(appmorphPath)) {
    existingFiles.push("appmorph.json");
  }
  if (existsSync(envPath)) {
    existingFiles.push(".env");
  }

  if (existingFiles.length > 0) {
    console.log(`\n  ⚠️  The following files already exist: ${existingFiles.join(", ")}`);
    const overwrite = await promptYesNo("Overwrite existing files?", false);
    if (!overwrite) {
      console.log("\n  Aborted. No files were written.\n");
      return;
    }
  }

  // Ensure directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write files
  writeFileSync(appmorphPath, appmorphJson);
  writeFileSync(envPath, envFile);

  console.log("\n  ✅ Configuration files created successfully!\n");
  console.log(`  • ${appmorphPath}`);
  console.log(`  • ${envPath}`);
  console.log("");
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.showVersion) {
    console.log(`appmorph v${getVersion()}`);
    process.exit(0);
  }

  if (args.showHelp) {
    showHelp();
    process.exit(0);
  }

  printHeader();

  console.log("  This wizard will help you configure Appmorph by creating:");
  console.log("  • appmorph.json - Project configuration");
  console.log("  • .env - Environment variables\n");

  const outputDir = await promptWithDefault(
    "Output directory for config files",
    process.cwd()
  );

  try {
    // Collect configurations
    const appmorphConfig = await collectAppmorphJsonConfig();
    const envConfig = await collectEnvConfig();

    // Generate file contents
    const appmorphJson = generateAppmorphJson(appmorphConfig);
    const envFile = generateEnvFile(envConfig);

    // Show preview
    showPreview(appmorphJson, envFile);

    // Confirm and write
    printSection("Confirm");
    const confirm = await promptYesNo("Write configuration files?", true);

    if (confirm) {
      await writeFiles(outputDir, appmorphJson, envFile);
    } else {
      console.log("\n  Aborted. No files were written.\n");
    }
  } catch (error) {
    console.error("\n  ❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
