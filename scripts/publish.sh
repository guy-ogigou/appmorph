#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$NPM_TOKEN" ]; then
  echo "Error: NPM_TOKEN not set. Please add it to .env file."
  exit 1
fi

# Configure npm authentication
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc

# Determine version bump type (default: patch)
BUMP_TYPE=${1:-patch}

if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch|premajor|preminor|prepatch|prerelease)$ ]]; then
  echo "Usage: ./scripts/publish.sh [major|minor|patch|premajor|preminor|prepatch|prerelease]"
  echo "Default: patch"
  exit 1
fi

echo "Publishing with version bump: $BUMP_TYPE"

# Get current version from root package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version
NEW_VERSION=$(npx semver $CURRENT_VERSION -i $BUMP_TYPE)
echo "New version: $NEW_VERSION"

# Update versions in all packages
echo "Updating package versions..."

# Update root package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update workspace packages
for pkg_dir in packages/shared packages/core packages/sdk; do
  if [ -d "$pkg_dir" ]; then
    node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./$pkg_dir/package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('./$pkg_dir/package.json', JSON.stringify(pkg, null, 2) + '\n');
"
    echo "Updated $pkg_dir to version $NEW_VERSION"
  fi
done

# Build all packages
echo "Building all packages..."
pnpm run build

# Publish packages in dependency order
echo "Publishing packages..."

# 1. Publish shared first (dependency of core and sdk)
echo "Publishing @appmorph/shared..."
cd packages/shared
pnpm publish --access public --no-git-checks
cd ../..

# 2. Publish core
echo "Publishing @appmorph/core..."
cd packages/core
pnpm publish --access public --no-git-checks
cd ../..

# 3. Publish sdk
echo "Publishing @appmorph/sdk..."
cd packages/sdk
pnpm publish --access public --no-git-checks
cd ../..

echo ""
echo "Successfully published all packages at version $NEW_VERSION"
echo ""
echo "Published packages:"
echo "  - @appmorph/shared@$NEW_VERSION"
echo "  - @appmorph/core@$NEW_VERSION"
echo "  - @appmorph/sdk@$NEW_VERSION"
