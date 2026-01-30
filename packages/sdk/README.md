# @appmorph/sdk

Embeddable widget for Appmorph. Allows users to customize applications using natural language prompts.

## Installation

```bash
npm install @appmorph/sdk
# or
pnpm add @appmorph/sdk
# or
yarn add @appmorph/sdk
```

## Quick Start

```typescript
import Appmorph, { createStaticAuthAdapter } from '@appmorph/sdk';

// Create an auth adapter
const auth = createStaticAuthAdapter(
  {
    userId: 'user-123',
    groupIds: ['team-a', 'team-b'],
    tenantId: 'acme-corp',
    roles: ['editor'],
  },
  'your-jwt-token'
);

// Initialize the widget
Appmorph.init({
  endpoint: 'http://localhost:3002',  // API server
  auth,
  position: 'bottom-right',
  theme: 'auto',
  buttonLabel: 'Customize',
});
```

## Features

### Real-time Progress Streaming

When a task is submitted, the widget shows real-time output from the AI agent as it modifies your code.

### Open Stage

After a task completes, click "Open Stage" to view the modified version:
- Sets the `appmorph_session` cookie with your session ID
- Opens the deploy server URL in a new tab
- The deploy server routes to your modified variant based on the cookie

### Revert to Default

When viewing a modified version (cookie exists), the widget shows a "Revert" button:
- Deletes the `appmorph_session` cookie
- Refreshes the page to load the default version

This allows seamless switching between the original and modified versions.

## Bundle Formats

The SDK is available in multiple formats:

| Format | File | Size (gzipped) |
|--------|------|----------------|
| ESM | `dist/appmorph.js` | ~10KB |
| UMD | `dist/appmorph.umd.cjs` | ~9KB |

### ESM (Recommended)

```typescript
import Appmorph from '@appmorph/sdk';
```

### UMD (Browser Global)

```html
<script src="https://unpkg.com/@appmorph/sdk/dist/appmorph.umd.cjs"></script>
<script>
  window.Appmorph.default.init({ ... });
</script>
```

## API Reference

### `Appmorph.init(options)`

Initialize the SDK and render the widget.

```typescript
interface AppmorphInitOptions {
  // Required: Backend endpoint URL
  endpoint: string;

  // Required: Authentication adapter
  auth: AuthAdapter;

  // Widget position (default: 'bottom-right')
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

  // Color theme (default: 'auto')
  theme?: 'light' | 'dark' | 'auto';

  // Button label (default: icon only)
  buttonLabel?: string;

  // Optional: User ID for persistence tracking
  // If not provided, a random UUID is generated and stored in appmorph_user_id cookie
  user_id?: string;
}
```

### `Appmorph.open()`

Programmatically open the widget panel.

```typescript
Appmorph.open();
```

### `Appmorph.close()`

Programmatically close the widget panel.

```typescript
Appmorph.close();
```

### `Appmorph.isOpen()`

Check if the widget panel is currently open.

```typescript
if (Appmorph.isOpen()) {
  console.log('Widget is open');
}
```

### `Appmorph.destroy()`

Remove the widget and clean up resources.

```typescript
Appmorph.destroy();
```

### `Appmorph.submitPrompt(prompt)`

Submit a prompt programmatically (without using the widget UI).

```typescript
const response = await Appmorph.submitPrompt('Add a logout button');
console.log('Task created:', response.taskId);
```

### `Appmorph.getTaskStatus(taskId)`

Get the status of a task.

```typescript
const status = await Appmorph.getTaskStatus('task-uuid');
console.log('Status:', status.task.status);
```

## Auth Adapters

The SDK requires an auth adapter to provide user context and authentication tokens.

### Static Adapter

For simple use cases with fixed credentials:

```typescript
import { createStaticAuthAdapter } from '@appmorph/sdk';

const auth = createStaticAuthAdapter(
  { userId: 'user-123', groupIds: ['team-a'] },
  'static-token'
);
```

### Callback Adapter

For dynamic credentials from your auth system:

```typescript
import { createCallbackAuthAdapter } from '@appmorph/sdk';

const auth = createCallbackAuthAdapter(
  async () => {
    // Fetch user context from your auth system
    const user = await myAuthService.getCurrentUser();
    return {
      userId: user.id,
      groupIds: user.teams.map(t => t.id),
      tenantId: user.organizationId,
      roles: user.roles,
    };
  },
  async () => {
    // Get current auth token
    return myAuthService.getAccessToken();
  }
);
```

### localStorage Adapter

For apps that store auth in localStorage:

```typescript
import { createLocalStorageAuthAdapter } from '@appmorph/sdk';

const auth = createLocalStorageAuthAdapter(
  'auth_token',      // localStorage key for token
  'user_context'     // localStorage key for user context JSON
);
```

### Custom Adapter

Implement the `AuthAdapter` interface directly:

```typescript
import type { AuthAdapter, UserContext } from '@appmorph/sdk';

const customAuth: AuthAdapter = {
  async getUserContext(): Promise<UserContext> {
    return {
      userId: 'user-123',
      groupIds: ['team-a'],
      tenantId: 'acme',
      roles: ['admin'],
    };
  },
  async getAuthToken(): Promise<string> {
    return 'your-token';
  },
};
```

## Styling

The widget uses CSS custom properties scoped to `[data-appmorph]`. You can override these in your CSS:

```css
[data-appmorph] {
  --appmorph-primary: #6366f1;
  --appmorph-primary-hover: #818cf8;
  --appmorph-bg: #ffffff;
  --appmorph-bg-panel: #f8fafc;
  --appmorph-text: #1a202c;
  --appmorph-text-muted: #718096;
  --appmorph-border: #e2e8f0;
}

/* Dark mode overrides */
[data-appmorph][data-theme="dark"] {
  --appmorph-bg: #1a1a2e;
  --appmorph-bg-panel: #16213e;
  --appmorph-text: #eaeaea;
  --appmorph-text-muted: #a0a0a0;
  --appmorph-border: #2d3748;
  --appmorph-primary: #6366f1;
  --appmorph-primary-hover: #818cf8;
}
```

## User Identification

The SDK automatically manages user identification for persistence tracking.

### How It Works

1. **With `user_id` option**: If you provide a `user_id` in the init options, it will be used and stored in the `appmorph_user_id` cookie.

2. **Without `user_id` option**: A random UUID is generated and stored in the `appmorph_user_id` cookie. This ID persists across sessions.

```typescript
// Explicit user ID
Appmorph.init({
  endpoint: 'http://localhost:3002',
  auth,
  user_id: 'my-user-123'  // Will be stored in cookie
});

// Auto-generated user ID
Appmorph.init({
  endpoint: 'http://localhost:3002',
  auth
  // appmorph_user_id cookie will be created automatically with a UUID
});
```

The `appmorph_user_id` is sent with every API request via the `X-Appmorph-User-Id` header and is used by the backend for task persistence.

## Session Management

The SDK uses cookies for session management:

| Cookie | Purpose |
|--------|---------|
| `appmorph_user_id` | Persistent user identifier for task tracking |
| `appmorph_session` | Stores the current session ID for modified versions |

### How Sessions Work

1. **Submit a task** → Task ID becomes the session ID
2. **Click "Open Stage"** → Cookie is set with session ID
3. **Deploy server reads cookie** → Routes to `./deploy/<session_id>/`
4. **Click "Revert"** → Cookie is deleted, page refreshes to default

### Manual Cookie Management

```typescript
// Check if viewing a modified version
const hasSession = document.cookie.includes('appmorph_session=');

// Clear session manually
document.cookie = 'appmorph_session=; path=/; max-age=0';
```

## TypeScript

The SDK is written in TypeScript and includes full type definitions:

```typescript
import Appmorph, {
  AppmorphInitOptions,
  AppmorphSDK,
  AuthAdapter,
  UserContext,
} from '@appmorph/sdk';
```

## Framework Integration

### React

```tsx
import { useEffect } from 'react';
import Appmorph, { createCallbackAuthAdapter } from '@appmorph/sdk';
import { useAuth } from './auth-context';

function App() {
  const { user, getToken } = useAuth();

  useEffect(() => {
    if (!user) return;

    const auth = createCallbackAuthAdapter(
      async () => ({
        userId: user.id,
        groupIds: user.teams,
      }),
      getToken
    );

    Appmorph.init({
      endpoint: process.env.REACT_APP_APPMORPH_URL!,
      auth,
    });

    return () => Appmorph.destroy();
  }, [user, getToken]);

  return <div>Your app content</div>;
}
```

### Vue

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue';
import Appmorph, { createStaticAuthAdapter } from '@appmorph/sdk';

onMounted(() => {
  const auth = createStaticAuthAdapter(
    { userId: 'user-123', groupIds: [] },
    'token'
  );

  Appmorph.init({
    endpoint: import.meta.env.VITE_APPMORPH_URL,
    auth,
  });
});

onUnmounted(() => {
  Appmorph.destroy();
});
</script>
```

## Development

```bash
# Build the SDK
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```
