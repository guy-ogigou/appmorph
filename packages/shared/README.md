# @appmorph/shared

Shared TypeScript types and constants for the Appmorph platform. This package is used by both `@appmorph/core` and `@appmorph/sdk`.

## Installation

```bash
pnpm add @appmorph/shared
```

## Usage

```typescript
import {
  // Types
  UserContext,
  AuthAdapter,
  Task,
  TaskStatus,
  AgentRunContext,
  AgentProgress,
  AgentResult,
  AppmorphConfig,

  // Staging & Deployment Types
  AppmorphProjectConfig,
  StageInfo,
  DeployInfo,
  BuildResult,

  // Constants
  BRANCH_PREFIX,
  API_ROUTES,
  SSE_EVENTS,
} from '@appmorph/shared';
```

## Types

### User & Auth

```typescript
interface UserContext {
  userId: string;
  groupIds: string[];
  tenantId?: string;
  roles?: string[];
}

interface AuthAdapter {
  getUserContext(): Promise<UserContext>;
  getAuthToken(): Promise<string>;
}
```

### Agent

```typescript
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

interface AgentConstraints {
  allowedPaths?: string[];
  blockedPaths?: string[];
  allowedCommands?: string[];
  blockedCommands?: string[];
  maxFileSize?: number;
  maxTotalChanges?: number;
}
```

### Staging & Deployment

```typescript
interface AppmorphProjectConfig {
  source_type: 'file_system';
  source_location: string;
  build_command: string;  // Must contain <dist> placeholder
  deploy_type: 'file_system';
  deploy_root: string;
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

interface BuildResult {
  success: boolean;
  output?: string;
  error?: string;
}
```

### Task

```typescript
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

interface Task {
  id: string;
  prompt: string;
  status: TaskStatus;
  userId: string;
  groupId?: string;
  branch: string;
  createdAt: number;
  updatedAt: number;
  result?: AgentResult;
  error?: string;
}
```

### API Contracts

```typescript
// Create task
interface CreateTaskRequest {
  prompt: string;
  groupId?: string;
}

interface CreateTaskResponse {
  taskId: string;
  branch: string;
}

// Task status
interface TaskStatusResponse {
  task: Task;
}

// Version management
interface VersionMapping {
  groupId: string;
  commitSha: string;
  deployedAt: number;
  deployedBy: string;
  previewUrl?: string;
}

interface VersionsConfig {
  production: VersionMapping | null;
  groups: Record<string, VersionMapping>;
}

// Promote/Revert
interface PromoteRequest {
  groupId: string;
  commitSha: string;
  toProduction?: boolean;
}

interface RevertRequest {
  groupId?: string;
  toCommitSha?: string;
}
```

### Configuration

```typescript
interface AppmorphConfig {
  version: '1';
  repo: RepoConfig;
  agent: AgentConfig;
  constraints?: AgentConstraints;
  plugins?: PluginConfig[];
}

interface RepoConfig {
  type: 'git' | 'github' | 'gitlab';
  url: string;
  defaultBranch?: string;
}

interface AgentConfig {
  type: 'claude-cli';
  model?: string;
  maxTokens?: number;
  instructions?: string;
}
```

### Plugin Hooks

```typescript
interface TaskContext {
  task: Task;
  user: UserContext;
  config: AppmorphConfig;
}

interface StageContext {
  task: Task;
  user: UserContext;
  branch: string;
  commitSha: string;
}

interface PromoteContext {
  user: UserContext;
  groupId: string;
  commitSha: string;
  toProduction: boolean;
}

interface VetoResult {
  vetoed: true;
  reason: string;
}

interface AuthDecision {
  allowed: boolean;
  reason?: string;
}
```

### SDK

```typescript
interface AppmorphInitOptions {
  endpoint: string;
  auth: AuthAdapter;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  buttonLabel?: string;
}

interface AppmorphSDK {
  init(options: AppmorphInitOptions): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
  submitPrompt(prompt: string): Promise<CreateTaskResponse>;
  getTaskStatus(taskId: string): Promise<TaskStatusResponse>;
}
```

## Constants

### Branch Prefixes

```typescript
const BRANCH_PREFIX = {
  GROUP: 'appmorph/g/',
  USER: 'appmorph/u/',
} as const;

// Usage
const groupBranch = `${BRANCH_PREFIX.GROUP}team-a`;  // 'appmorph/g/team-a'
const userBranch = `${BRANCH_PREFIX.USER}user-123`; // 'appmorph/u/user-123'
```

### API Routes

```typescript
const API_ROUTES = {
  HEALTH: '/health',
  TASK: '/api/task',
  TASK_STATUS: '/api/task/:taskId',
  TASK_STREAM: '/api/task/:taskId/stream',
  VERSION: '/api/version',
  PROMOTE: '/api/promote',
  REVERT: '/api/revert',
} as const;
```

### SSE Events

```typescript
const SSE_EVENTS = {
  PROGRESS: 'progress',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;
```

### Config Files

```typescript
const DEFAULT_CONFIG_FILE = 'appmorph.json';
const VERSIONS_FILE = 'appmorph.versions.json';
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```
