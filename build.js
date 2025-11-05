#!/usr/bin/env node

// Force disable turbopack by removing the env vars entirely
delete process.env.TURBOPACK;
delete process.env.NEXT_PRIVATE_SKIP_TURBOPACK;
delete process.env.TURBO;

// Run next build
const { execSync } = require('child_process');

try {
  const env = { ...process.env };
  // Ensure turbopack vars are not present
  delete env.TURBOPACK;
  delete env.NEXT_PRIVATE_SKIP_TURBOPACK;
  delete env.TURBO;

  execSync('next build', {
    stdio: 'inherit',
    env
  });
} catch (error) {
  process.exit(1);
}

