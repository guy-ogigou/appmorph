# @appmorph/core

Backend service for Appmorph. Handles task orchestration, AI agent execution, staging, building, and deployment.

## Installation

```bash
npm install @appmorph/core
# or
pnpm add @appmorph/core
# or
yarn add @appmorph/core
```

## Quick Start

### Using the CLI (Recommended)

The easiest way to get started is using the interactive setup wizard:

```bash
# Run the setup wizard
npx @appmorph/core

# Or if installed globally
appmorph
```

The CLI will guide you through creating both configuration files:

```
╔════════════════════════════════════════════════════════════╗
║                    APPMORPH SETUP WIZARD                   ║
╚════════════════════════════════════════════════════════════╝

  This wizard will help you configure Appmorph by creating:
  • appmorph.json - Project configuration
  • .env - Environment variables
```

### CLI Options

```bash
appmorph           # Run interactive setup wizard
appmorph --help    # Show all configuration parameters
appmorph --version # Show version
```

### Running the Server

```bash
# Development mode with hot reload
pnpm dev

# Production mode
pnpm build
pnpm start
```

The API server starts on port 3002 and the deploy server on port 3003 by default.

## Configuration

The CLI creates two configuration files. You can also create them manually:

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | API server port |
| `HOST` | `0.0.0.0` | Server host binding |
| `APPMORPH_PROJECT_PATH` | - | Path to project folder (auto-detected from appmorph.json location) |
| `APPMORPH_AGENT_TYPE` | `claude-cli` | AI agent type (only `claude-cli` supported) |
| `APPMORPH_CLAUDE_COMMAND` | `claude` | Claude CLI command name (must be in PATH) |
| `OPENAI_API_KEY` | - | OpenAI API key (enables message sanitizer) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model for message sanitization |
| `SANITIZER_INTERVAL_MS` | `2000` | Interval between sanitizer flushes (ms) |

The message sanitizer is an optional feature that uses OpenAI to provide cleaner, more concise status messages during agent execution. It's only enabled when `OPENAI_API_KEY` is set.

### Project Configuration (appmorph.json)

The `appmorph.json` file in your project root is **required**:

```json
{
  "source_type": "file_system",
  "source_location": "./examples/demo-app",
  "build_command": "npx vite build --outDir <dist>",
  "deploy_type": "file_system",
  "deploy_root": "./deploy"
}
```

| Field | Description |
|-------|-------------|
| `source_type` | Must be `"file_system"` |
| `source_location` | Path to source code |
| `build_command` | Build command with `<dist>` placeholder |
| `deploy_type` | Must be `"file_system"` |
| `deploy_root` | Directory for built output |

## Architecture

```
src/
├── index.ts              # Server entry point (starts API + deploy servers)
├── cli/
│   └── init.ts           # CLI setup wizard (creates appmorph.json and .env)
├── config/
│   └── index.ts          # Configuration loader and validator
├── server/
│   ├── app.ts            # Fastify app setup
│   └── routes/
│       └── task.ts       # Task CRUD and streaming
├── agent/
│   ├── interface.ts      # IAgent interface
│   └── claude-cli.ts     # Claude CLI agent implementation
├── staging/
│   └── index.ts          # FileSystemStagingManager (copies source to stage)
├── build/
│   └── index.ts          # FileSystemBuildManager (executes build command)
├── deploy/
│   ├── index.ts          # FileSystemDeployManager (manages deploy server)
│   └── proxy-server.ts   # Cookie-based reverse proxy
├── task/
│   └── executor.ts       # TaskExecutor (orchestrates staging → agent → build)
├── persistence/
│   └── index.ts          # TaskPersistence (JSON file storage for tasks)
├── services/
│   ├── openai-client.ts  # OpenAI API client
│   └── message-sanitizer.ts # Message batching and summarization
├── plugins/
│   ├── types.ts          # Plugin interface
│   ├── loader.ts         # Plugin loading
│   └── hooks.ts          # Hook runner
└── branch/               # Branch naming utilities
```

### Task Execution Flow

```
1. Task Created (persisted to JSON)
      ↓
2. Stage Source (copy to ./stage/<sessionId>)
      ↓
3. Run Agent (modify staged copy)
      ↓
4. Build (output to ./deploy/<sessionId>)
      ↓
5. Return deployUrl to client
```

## Persistence

Tasks are automatically persisted to a JSON file (`appmorph_tasks.json`) in the project root.

### Persisted Data

Each task entry contains:

| Field | Description |
|-------|-------------|
| `source_base` | Path to the source code from `appmorph.json` |
| `appmorph_user_id` | User identifier from the SDK (cookie-based) |
| `prompt` | The user's modification request |
| `session_id` | Unique task/session identifier |
| `created_at` | Timestamp when the task was created (ms since epoch) |
| `created_date` | ISO 8601 formatted date string |

### File Format

```json
{
  "tasks": [
    {
      "source_base": "/path/to/source",
      "appmorph_user_id": "abc123-uuid",
      "prompt": "Add a dark mode toggle",
      "session_id": "task-uuid-here",
      "created_at": 1706640000000,
      "created_date": "2024-01-30T12:00:00.000Z"
    }
  ]
}
```

This persistence layer enables:
- Tracking user activity across sessions
- Future support for chaining prompt requests (using previous `session_id` as the new `source_base`)
- Analytics and audit logging

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### Create Task

```
POST /api/task
Content-Type: application/json
X-User-Id: user-123
X-Appmorph-User-Id: persistent-user-uuid

{
  "prompt": "Add a dark mode toggle"
}
```

Response:
```json
{
  "taskId": "uuid",
  "branch": "appmorph/g/default"
}
```

This endpoint:
1. Persists the task entry to `appmorph_tasks.json`
2. Creates a staged copy of the source
3. Runs the AI agent on the staged copy
4. Builds the modified app
5. Returns the task ID and deploy URL

The `X-Appmorph-User-Id` header is automatically sent by the SDK and is used for persistence tracking.

### Get Task Status

```
GET /api/task/:taskId
```

Response:
```json
{
  "task": {
    "id": "uuid",
    "prompt": "Add a dark mode toggle",
    "status": "completed",
    "branch": "appmorph/g/default",
    "createdAt": 1234567890,
    "updatedAt": 1234567890,
    "result": {
      "success": true,
      "filesChanged": ["src/App.tsx"],
      "summary": "Added dark mode toggle",
      "deployInfo": {
        "sessionId": "uuid",
        "deployPath": "/path/to/deploy/uuid",
        "deployUrl": "http://localhost:3003/#session=uuid"
      }
    }
  }
}
```

### Stream Task Progress (SSE)

```
GET /api/task/:taskId/stream
Accept: text/event-stream
```

Events:
- `progress` - Agent progress updates (includes stdout streaming)
- `complete` - Task completed with `deployInfo`
- `error` - Task failed

## Deploy Server

The deploy server is a cookie-based reverse proxy that serves built applications.

### How It Works

1. **No cookie**: Serves the default app from `./deploy/`
2. **With `appmorph_session` cookie**: Serves variant from `./deploy/<session_id>/`

### Cookie Format

```
appmorph_session=<session_id>
```

The SDK widget automatically sets this cookie when the user clicks "Open Stage".

## Agent Interface

Agents implement the `IAgent` interface:

```typescript
interface IAgent {
  readonly name: string;
  run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined>;
}

interface AgentRunContext {
  prompt: string;
  repoPath: string;  // Points to staged copy during execution
  branch: string;
  instructions?: string;
  constraints: AgentConstraints;
}

interface AgentProgress {
  type: 'log' | 'file_change' | 'thinking';
  content: string;
  timestamp: number;
}

interface AgentResult {
  success: boolean;
  commitSha?: string;
  filesChanged: string[];
  summary: string;
  testResults?: TestResult[];
  stageInfo?: StageInfo;
  deployInfo?: DeployInfo;
}

interface StageInfo {
  sessionId: string;
  stagePath: string;
}

interface DeployInfo {
  sessionId: string;
  deployPath: string;
  deployUrl: string;
}
```

### Creating a Custom Agent

```typescript
import { BaseAgent, AgentRunContext, AgentProgress, AgentResult } from '@appmorph/core';

class MyCustomAgent extends BaseAgent {
  readonly name = 'my-custom-agent';

  async *run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined> {
    yield this.createProgress('log', 'Starting...');

    // Your agent logic here

    return this.createResult(true, 'Completed successfully', {
      filesChanged: ['src/app.tsx'],
      commitSha: 'abc123',
    });
  }
}
```

## Plugin System

Plugins can hook into various lifecycle events:

```typescript
interface AppmorphPlugin {
  name: string;

  // Initialization
  onLoad?(): Promise<void>;

  // Authentication
  resolveUserContext?(req: FastifyRequest): Promise<UserContext | null>;
  authorize?(action: Action, ctx: AuthContext): Promise<AuthDecision>;

  // Agent lifecycle
  beforeAgentRun?(ctx: TaskContext): Promise<void | VetoResult>;
  afterAgentRun?(ctx: TaskContext, result: AgentResult): Promise<void>;

  // Deployment lifecycle
  beforeStage?(ctx: StageContext): Promise<void | VetoResult>;
  afterStage?(ctx: StageContext, result: StageResult): Promise<void>;
  beforePromote?(ctx: PromoteContext): Promise<void | VetoResult>;
  afterPromote?(ctx: PromoteContext, result: PromoteResult): Promise<void>;

  // Other
  onRevert?(ctx: RevertContext): Promise<void>;
  audit?(event: AuditEvent): Promise<void>;
}
```

### Registering Plugins

Plugins can be loaded from configuration or registered directly:

```typescript
import { getPluginLoader } from '@appmorph/core';

const loader = getPluginLoader();
loader.registerPlugin({
  name: 'my-plugin',
  async beforeAgentRun(ctx) {
    console.log('Agent starting for task:', ctx.task.id);
  },
});
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -f packages/core/Dockerfile -t appmorph-core .

# Run container
docker run -p 3001:3001 appmorph-core
```

Or use docker-compose from the project root:

```bash
docker-compose up core
```

## CLI Reference

The `appmorph` CLI helps you set up configuration files interactively.

### Installation

```bash
# Global installation
npm install -g @appmorph/core

# Or use npx
npx @appmorph/core
```

### Commands

| Command | Description |
|---------|-------------|
| `appmorph` | Run the interactive setup wizard |
| `appmorph --help` | Show help with all configuration parameters |
| `appmorph --version` | Show version number |

### Configuration Parameters

The CLI configures the following parameters:

**appmorph.json (Project Configuration)**

| Parameter | Description |
|-----------|-------------|
| `source_type` | Source type (always `"file_system"`) |
| `source_location` | Path to your source code |
| `build_command` | Build command with `<dist>` placeholder |
| `deploy_type` | Deploy type (always `"file_system"`) |
| `deploy_root` | Output directory for builds |

**.env (Environment Variables)**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `PORT` | `3002` | API server port |
| `HOST` | `0.0.0.0` | Server host |
| `APPMORPH_PROJECT_PATH` | - | Project path (auto-detected) |
| `APPMORPH_AGENT_TYPE` | `claude-cli` | Agent type |
| `APPMORPH_CLAUDE_COMMAND` | `claude` | Claude CLI command |
| `OPENAI_API_KEY` | - | OpenAI key (enables sanitizer) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model |
| `SANITIZER_INTERVAL_MS` | `2000` | Sanitizer interval (ms) |

### Example Output

```
╔════════════════════════════════════════════════════════════╗
║                    APPMORPH SETUP WIZARD                   ║
╚════════════════════════════════════════════════════════════╝

  Output directory for config files [/your/project]:

┌─ Project Configuration (appmorph.json) ──────────────────┐

  Source code location (relative path) [./src]: ./my-app
  Build command (use <dist> for output dir) [npm run build -- --outDir <dist>]:
  Deploy output directory [./deploy]:

┌─ Environment Configuration (.env) ───────────────────────┐

  ── Server Settings ──
  API server port [3002]:
  Server host [0.0.0.0]:
  ...
```

## Development

```bash
# Run in development mode
pnpm dev

# Run CLI in development mode
pnpm init

# Type check
pnpm typecheck

# Build
pnpm build

# Clean
pnpm clean
```
