# @appmorph/plugin-amplify-deploy

AWS Amplify deployment plugin for Appmorph. Automatically deploys preview and production builds via AWS Amplify.

> **Note**: This plugin provides cloud-based deployment as an alternative to the built-in file system deployment. Use this when you need AWS Amplify-hosted preview URLs instead of local file serving.

## Installation

```bash
pnpm add @appmorph/plugin-amplify-deploy
```

## Configuration

Add to your `appmorph.json`:

```json
{
  "plugins": [
    {
      "name": "@appmorph/plugin-amplify-deploy",
      "options": {
        "appId": "your-amplify-app-id",
        "region": "us-east-1"
      }
    }
  ]
}
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `appId` | string | Yes | AWS Amplify app ID |
| `region` | string | No | AWS region (default: from environment) |
| `previewBranchPrefix` | string | No | Prefix for preview branches |

## AWS Credentials

The plugin uses the standard AWS credential chain:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM role (when running on AWS)

### Required IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "amplify:StartDeployment",
        "amplify:GetBranch",
        "amplify:CreateBranch",
        "amplify:DeleteBranch"
      ],
      "Resource": "arn:aws:amplify:*:*:apps/your-app-id/*"
    }
  ]
}
```

## How It Works

### Preview Deployments

When a task completes successfully (`afterStage` hook):

1. Plugin checks if the branch exists in Amplify
2. Creates the branch if needed
3. Triggers a deployment for the branch
4. Returns the preview URL

### Production Deployments

When a version is promoted to production (`afterPromote` hook with `toProduction: true`):

1. Plugin merges the branch to the production branch
2. Triggers a production deployment
3. Returns the production URL

## Usage

```typescript
import { createAmplifyDeployPlugin } from '@appmorph/plugin-amplify-deploy';

const plugin = createAmplifyDeployPlugin({
  appId: 'd1234567890',
  region: 'us-east-1',
});
```

## Hooks Implemented

| Hook | Description |
|------|-------------|
| `onLoad` | Validates AWS credentials and Amplify app access |
| `afterStage` | Triggers preview deployment after staging |
| `afterPromote` | Triggers production deployment after promotion |

## Development Status

This plugin is a reference implementation for Phase 3. Current status:

- [x] Plugin structure
- [x] Configuration schema
- [ ] AWS SDK integration
- [ ] Preview deployment logic
- [ ] Production deployment logic
- [ ] Branch management

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev
```
