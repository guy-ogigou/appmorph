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
  endpoint: 'https://api.appmorph.example.com',
  auth,
  position: 'bottom-right',
  theme: 'auto',
  buttonLabel: 'Customize',
});
```

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
