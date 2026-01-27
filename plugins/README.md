# Appmorph Plugins

Plugins extend Appmorph's functionality by hooking into various lifecycle events.

## Available Plugins

| Plugin | Description |
|--------|-------------|
| [@appmorph/plugin-amplify-deploy](./amplify-deploy) | AWS Amplify deployment integration |

## Plugin Interface

Plugins implement the `AppmorphPlugin` interface:

```typescript
interface AppmorphPlugin {
  name: string;

  // Initialization
  onLoad?(): Promise<void>;

  // Authentication & Authorization
  resolveUserContext?(req: FastifyRequest): Promise<UserContext | null>;
  authorize?(action: Action, ctx: AuthContext): Promise<AuthDecision>;

  // Agent Lifecycle
  beforeAgentRun?(ctx: TaskContext): Promise<void | VetoResult>;
  afterAgentRun?(ctx: TaskContext, result: AgentResult): Promise<void>;

  // Deployment Lifecycle
  beforeStage?(ctx: StageContext): Promise<void | VetoResult>;
  afterStage?(ctx: StageContext, result: StageResult): Promise<void>;
  beforePromote?(ctx: PromoteContext): Promise<void | VetoResult>;
  afterPromote?(ctx: PromoteContext, result: PromoteResult): Promise<void>;

  // Other Hooks
  onRevert?(ctx: RevertContext): Promise<void>;
  audit?(event: AuditEvent): Promise<void>;
}
```

## Hook Descriptions

### `onLoad`

Called when the plugin is loaded during server startup. Use for initialization.

```typescript
async onLoad() {
  await this.initializeExternalService();
}
```

### `resolveUserContext`

Extract user context from an incoming request. First plugin to return a non-null value wins.

```typescript
async resolveUserContext(req: FastifyRequest): Promise<UserContext | null> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  const decoded = await verifyJWT(token);
  return {
    userId: decoded.sub,
    groupIds: decoded.groups,
    tenantId: decoded.org,
    roles: decoded.roles,
  };
}
```

### `authorize`

Check if an action is allowed. Return `{ allowed: false }` to deny.

```typescript
async authorize(action: Action, ctx: AuthContext): Promise<AuthDecision> {
  if (action.type === 'promote' && action.toProduction) {
    if (!ctx.user.roles?.includes('admin')) {
      return { allowed: false, reason: 'Only admins can promote to production' };
    }
  }
  return { allowed: true };
}
```

### `beforeAgentRun` / `afterAgentRun`

Hook into agent execution. Return a `VetoResult` from `beforeAgentRun` to prevent execution.

```typescript
async beforeAgentRun(ctx: TaskContext): Promise<void | VetoResult> {
  // Rate limiting
  const count = await this.getTaskCountForUser(ctx.user.userId, '1h');
  if (count >= 10) {
    return { vetoed: true, reason: 'Rate limit exceeded (10/hour)' };
  }
}

async afterAgentRun(ctx: TaskContext, result: AgentResult) {
  await this.logToDatadog({
    event: 'agent_completed',
    taskId: ctx.task.id,
    success: result.success,
    filesChanged: result.filesChanged.length,
  });
}
```

### `beforeStage` / `afterStage`

Hook into staging deployment. Use `afterStage` to trigger actual deployments.

```typescript
async afterStage(ctx: StageContext, result: StageResult) {
  if (!result.success) return;

  // Trigger Amplify preview deployment
  await this.amplify.startDeployment({
    appId: this.config.appId,
    branchName: ctx.branch,
  });
}
```

### `beforePromote` / `afterPromote`

Hook into production promotion.

```typescript
async beforePromote(ctx: PromoteContext): Promise<void | VetoResult> {
  if (ctx.toProduction) {
    // Require approval for production deployments
    const approved = await this.checkApproval(ctx.commitSha);
    if (!approved) {
      return { vetoed: true, reason: 'Deployment not approved' };
    }
  }
}
```

### `onRevert`

Called when a version is reverted.

```typescript
async onRevert(ctx: RevertContext) {
  await this.notifySlack({
    channel: '#deployments',
    message: `Reverted from ${ctx.fromCommitSha} to ${ctx.toCommitSha}`,
  });
}
```

### `audit`

Called for all auditable events. Errors are logged but don't fail the operation.

```typescript
async audit(event: AuditEvent) {
  await this.auditLog.write({
    timestamp: event.timestamp,
    type: event.type,
    userId: event.user.userId,
    ...event.details,
  });
}
```

## Creating a Plugin

### 1. Create the package

```bash
mkdir plugins/my-plugin
cd plugins/my-plugin
pnpm init
```

### 2. Add dependencies

```json
{
  "name": "@appmorph/plugin-my-plugin",
  "peerDependencies": {
    "@appmorph/core": "workspace:*"
  },
  "dependencies": {
    "@appmorph/shared": "workspace:*"
  }
}
```

### 3. Implement the plugin

```typescript
// src/index.ts
import type { AppmorphPlugin } from '@appmorph/core';

export interface MyPluginOptions {
  apiKey: string;
}

export function createMyPlugin(options: MyPluginOptions): AppmorphPlugin {
  return {
    name: 'my-plugin',

    async onLoad() {
      console.log('My plugin loaded');
    },

    async afterAgentRun(ctx, result) {
      // Your logic here
    },
  };
}

export default createMyPlugin;
```

### 4. Configure in appmorph.json

```json
{
  "plugins": [
    {
      "name": "@appmorph/plugin-my-plugin",
      "options": {
        "apiKey": "xxx"
      }
    }
  ]
}
```

## Plugin Execution Order

1. Plugins are loaded in the order specified in `appmorph.json`
2. For "before" hooks, first plugin to return a `VetoResult` stops execution
3. For "resolve" hooks (like `resolveUserContext`), first non-null value wins
4. For "after" hooks, all plugins are called in order
5. `audit` hooks are fire-and-forget (errors logged but don't fail)

## Best Practices

1. **Keep plugins focused** - One plugin should do one thing well
2. **Handle errors gracefully** - Don't let plugin errors crash the server
3. **Use async/await** - All hooks are async, use them properly
4. **Log appropriately** - Use structured logging for debugging
5. **Test independently** - Plugins should be testable in isolation
