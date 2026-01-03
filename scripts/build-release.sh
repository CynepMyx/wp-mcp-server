#!/bin/bash

# Build script for creating GitHub releases
# Usage: ./scripts/build-release.sh [version]

VERSION=${1:-"1.0.0"}
RELEASE_NAME="wordpress-mcp-server-v${VERSION}"

echo "🔨 Building WordPress MCP Server v${VERSION}..."

# Clean previous builds
rm -rf dist/
rm -f ${RELEASE_NAME}.tar.gz
rm -f ${RELEASE_NAME}.zip

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build TypeScript
echo "🔧 Compiling TypeScript..."
npm run build

# Create release directory
echo "📁 Preparing release..."
mkdir -p release-tmp

# Copy files
cp -r dist/ release-tmp/dist/
cp package.json release-tmp/
cp package-lock.json release-tmp/
cp .env.example release-tmp/
cp README.md release-tmp/
cp LICENSE release-tmp/

# Create archives
echo "📦 Creating archives..."
cd release-tmp

# tar.gz for Linux/macOS
tar -czf ../${RELEASE_NAME}.tar.gz .

# zip for Windows
zip -r ../${RELEASE_NAME}.zip .

cd ..

# Cleanup
rm -rf release-tmp

echo ""
echo "✅ Release created successfully!"
echo ""
echo "📦 Files:"
echo "   - ${RELEASE_NAME}.tar.gz"
echo "   - ${RELEASE_NAME}.zip"
echo ""
echo "📋 Next steps:"
echo "   1. Create a new GitHub release: https://github.com/YOUR_USERNAME/wordpress-mcp-server/releases/new"
echo "   2. Tag version: v${VERSION}"
echo "   3. Upload the archives"
echo ""
