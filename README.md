# appmorph.ai

AI-powered app customization platform. Enable your users to modify and extend your application using natural language prompts.

## Overview

Appmorph consists of two main components:

- **@appmorph/sdk** - Embeddable widget that users interact with
- **@appmorph/core** - Backend service that processes requests and orchestrates AI agents

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App      │     │  Appmorph Core  │     │   Git Repo      │
│   + SDK Widget  │────▶│  (Backend)      │────▶│   (Your Code)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   AI Agent      │
                        │   (Claude CLI)  │
                        └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/appmorph.git
cd appmorph

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Running Locally

```bash
# Start the backend
pnpm --filter @appmorph/core dev

# In another terminal, start the demo app
pnpm --filter @appmorph/demo-app dev
```

The backend runs on `http://localhost:3001` and the demo app on `http://localhost:3000`.

### Using Docker

```bash
docker-compose up
```

## Project Structure

```
appmorph/
├── packages/
│   ├── shared/          # Shared types and constants
│   ├── core/            # Backend service
│   └── sdk/             # Frontend widget
├── plugins/
│   └── amplify-deploy/  # Example deployment plugin
└── examples/
    └── demo-app/        # Demo application
```

## Packages

| Package | Description |
|---------|-------------|
| [@appmorph/shared](./packages/shared) | Shared TypeScript types and constants |
| [@appmorph/core](./packages/core) | Backend service (Fastify, plugin system, agent orchestration) |
| [@appmorph/sdk](./packages/sdk) | Embeddable widget (Preact, ~23KB gzipped) |

## How It Works

1. **User submits a prompt** via the SDK widget
2. **Backend creates a task** and assigns it to a branch (`appmorph/u/<userId>` or `appmorph/g/<groupId>`)
3. **AI agent processes the prompt** and makes code changes
4. **Changes are committed** to the branch
5. **User can preview** changes via staging deployment
6. **User can promote** changes to production

## Branch Strategy

Appmorph uses a branch-per-user/group strategy:

- `appmorph/u/<userId>` - Personal branches for individual users
- `appmorph/g/<groupId>` - Shared branches for groups/teams

## Configuration

Create an `appmorph.json` in your repository root:

```json
{
  "version": "1",
  "repo": {
    "type": "github",
    "url": "https://github.com/your-org/your-app",
    "defaultBranch": "main"
  },
  "agent": {
    "type": "claude-cli",
    "instructions": "You are modifying a React application..."
  },
  "constraints": {
    "allowedPaths": ["src/**"],
    "blockedPaths": ["src/config/**", ".env*"],
    "blockedCommands": ["rm -rf", "DROP TABLE"]
  },
  "plugins": [
    { "name": "@appmorph/plugin-amplify-deploy" }
  ]
}
```

## SDK Integration

```typescript
import Appmorph, { createStaticAuthAdapter } from '@appmorph/sdk';

// Create an auth adapter
const auth = createStaticAuthAdapter(
  { userId: 'user-123', groupIds: ['team-a'] },
  'your-auth-token'
);

// Initialize the widget
Appmorph.init({
  endpoint: 'https://your-appmorph-backend.com',
  auth,
  position: 'bottom-right',
  theme: 'auto',
});
```

## Plugin System

Appmorph supports plugins for:

- **Authentication** - Custom user context resolution
- **Authorization** - Fine-grained access control
- **Deployment** - Staging and production deployments
- **Auditing** - Event logging and compliance

See the [plugins documentation](./plugins/README.md) for details.

## Development

```bash
# Run all packages in dev mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Clean build artifacts
pnpm clean
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/task` | Create a new task |
| GET | `/api/task/:taskId` | Get task status |
| GET | `/api/task/:taskId/stream` | Stream task progress (SSE) |
| GET | `/api/version` | Get version mappings |
| POST | `/api/promote` | Promote a version |
| POST | `/api/revert` | Revert to previous version |

## Roadmap

- [x] **Phase 1**: Foundation (monorepo, types, skeleton)
- [ ] **Phase 2**: Core functionality (git ops, agent execution, streaming)
- [ ] **Phase 3**: Deploy & promote (staging, production, plugins)
- [ ] **Phase 4**: Polish & production (security, rate limiting, docs)

## License

MIT
