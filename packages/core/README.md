# @appmorph/core

Backend service for Appmorph. Handles task orchestration, AI agent execution, staging, building, and deployment.

## Installation

```bash
pnpm add @appmorph/core
```

## Quick Start

```bash
# Development mode with hot reload
pnpm dev

# Production mode
pnpm build
pnpm start
```

The API server starts on port 3002 and the deploy server on port 3003 by default.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | API server port |
| `HOST` | `0.0.0.0` | Server host |
| `NODE_ENV` | `development` | Environment mode |
| `DEPLOY_PORT` | `3003` | Deploy server port |

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
├── config/
│   └── index.ts          # appmorph.json configuration loader
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
├── plugins/
│   ├── types.ts          # Plugin interface
│   ├── loader.ts         # Plugin loading
│   └── hooks.ts          # Hook runner
└── branch/               # Branch naming utilities
```

### Task Execution Flow

```
1. Task Created
      ↓
2. Stage Source (copy to ./stage/<sessionId>)
      ↓
3. Run Agent (modify staged copy)
      ↓
4. Build (output to ./deploy/<sessionId>)
      ↓
5. Return deployUrl to client
```

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
1. Creates a staged copy of the source
2. Runs the AI agent on the staged copy
3. Builds the modified app
4. Returns the task ID and deploy URL

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

## Development

```bash
# Run in development mode
pnpm dev

# Type check
pnpm typecheck

# Build
pnpm build

# Clean
pnpm clean
```
