# appmorph.ai

AI-powered app customization platform. Enable your users to modify and extend your application using natural language prompts.

## Overview

Appmorph consists of two main components:

- **@appmorph/sdk** - Embeddable widget that users interact with
- **@appmorph/core** - Backend service that processes requests and orchestrates AI agents

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App      │     │  Appmorph Core  │     │   Source Code   │
│   + SDK Widget  │────▶│  (Backend)      │────▶│   (Local FS)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   AI Agent      │
                        │   (Claude CLI)  │
                        └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  Deploy Server  │
                        │ (Cookie Proxy)  │
                        └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Claude CLI installed and authenticated

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

### Configuration

Create an `appmorph.json` file in your project root (required):

```json
{
  "source_type": "file_system",
  "source_location": "./examples/demo-app",
  "build_command": "npx vite build --outDir <dist>",
  "deploy_type": "file_system",
  "deploy_root": "./deploy"
}
```

### Running Locally

```bash
# Start the backend (also starts the deploy server)
pnpm --filter @appmorph/core dev

# In another terminal, start the demo app with SDK
pnpm --filter @appmorph/demo-app dev
```

The API server runs on `http://localhost:3002`, the deploy server on `http://localhost:3003`, and the demo app on `http://localhost:5173`.

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

1. **User submits a prompt** via the SDK widget embedded in your app
2. **Backend creates a staging copy** of your source code in `./stage/<session_id>`
3. **AI agent processes the prompt** and modifies the staged copy
4. **Build executes** using your configured `build_command`, outputs to `./deploy/<session_id>`
5. **User clicks "Open Stage"** to view changes (sets `appmorph_session` cookie)
6. **Deploy server routes requests** based on the session cookie
7. **User can revert** by clicking "Revert" in the widget (deletes cookie, refreshes page)

## Architecture

### Staging Workflow

When a task is submitted:

```
Source Code          Stage Copy              Build Output
./examples/demo-app → ./stage/<session_id> → ./deploy/<session_id>
                           ↑
                     Agent modifies here
```

### Cookie-Based Routing

The deploy server (port 3003) uses the `appmorph_session` cookie to route requests:

- **No cookie** → Serves default app from `./deploy/`
- **With cookie** → Serves variant from `./deploy/<session_id>/`

This allows clean URLs without session IDs in the path, and users can seamlessly switch between the default and modified versions.

## Configuration

Create an `appmorph.json` in your project root (required):

```json
{
  "source_type": "file_system",
  "source_location": "./examples/demo-app",
  "build_command": "npx vite build --outDir <dist>",
  "deploy_type": "file_system",
  "deploy_root": "./deploy"
}
```

### Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `source_type` | `"file_system"` | Source code location type |
| `source_location` | `string` | Path to source code (relative or absolute) |
| `build_command` | `string` | Build command with `<dist>` placeholder for output directory |
| `deploy_type` | `"file_system"` | Deployment type |
| `deploy_root` | `string` | Directory for built output |

The `<dist>` placeholder in `build_command` is replaced at runtime:
- Default app build: replaced with `deploy_root`
- Session build: replaced with `deploy_root/<session_id>`

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

API server runs on port 3002 by default.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/task` | Create a new task (stages source, runs agent, builds) |
| GET | `/api/task/:taskId` | Get task status |
| GET | `/api/task/:taskId/stream` | Stream task progress (SSE) |

## Deploy Server

The deploy server runs on port 3003 and serves built applications:

| Cookie | Behavior |
|--------|----------|
| None | Serves `./deploy/` (default app) |
| `appmorph_session=<id>` | Serves `./deploy/<id>/` (modified variant) |

## Roadmap

- [x] **Phase 1**: Foundation (monorepo, types, skeleton)
- [x] **Phase 2**: Core functionality (agent execution, streaming)
- [x] **Phase 3**: Staging & deployment (file system staging, build, cookie-based proxy)
- [ ] **Phase 4**: Polish & production (security, rate limiting, docs)

## License

MIT
