# @appmorph/core

Backend service for Appmorph. Handles task orchestration, AI agent execution, and plugin lifecycle management.

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

The server starts on port 3001 by default.

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `NODE_ENV` | `development` | Environment mode |

## Architecture

```
src/
├── index.ts              # Server entry point
├── server/
│   ├── app.ts            # Fastify app setup
│   └── routes/
│       ├── task.ts       # Task CRUD and streaming
│       └── version.ts    # Version management
├── agent/
│   ├── interface.ts      # IAgent interface
│   └── claude-cli.ts     # Claude CLI agent implementation
├── plugins/
│   ├── types.ts          # Plugin interface
│   ├── loader.ts         # Plugin loading
│   └── hooks.ts          # Hook runner
├── repo/                 # Git operations
├── branch/               # Branch naming utilities
└── versions/             # Version mapping management
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
  "prompt": "Add a dark mode toggle",
  "groupId": "team-a"  // optional
}
```

Response:
```json
{
  "taskId": "uuid",
  "branch": "appmorph/g/team-a"
}
```

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
    "status": "running",
    "branch": "appmorph/g/team-a",
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

### Stream Task Progress (SSE)

```
GET /api/task/:taskId/stream
Accept: text/event-stream
```

Events:
- `progress` - Agent progress updates
- `complete` - Task completed
- `error` - Task failed

### Version Management

```
GET /api/version              # Get current versions
POST /api/promote             # Promote a version
POST /api/revert              # Revert to previous
```

## Agent Interface

Agents implement the `IAgent` interface:

```typescript
interface IAgent {
  readonly name: string;
  run(ctx: AgentRunContext): AsyncGenerator<AgentProgress, AgentResult, undefined>;
}

interface AgentRunContext {
  prompt: string;
  repoPath: string;
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
