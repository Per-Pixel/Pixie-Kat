import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configUrl = pathToFileURL(__dirname + '/../config.js').href;

function runConfig(env) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `import(${JSON.stringify(configUrl)})`],
    { env: { ...process.env, ...env }, cwd: __dirname, encoding: 'utf8' }
  );
}

test('throws in production when FRONTEND_URL is missing', () => {
  const result = runConfig({
    NODE_ENV: 'production',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
  });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Missing required environment variables: FRONTEND_URL, CORS_ORIGINS/);
});

test('throws in production when FRONTEND_URL points to localhost', () => {
  const result = runConfig({
    NODE_ENV: 'production',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    FRONTEND_URL: 'http://localhost:5173',
    CORS_ORIGINS: 'http://localhost:5173',
  });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /FRONTEND_URL must not point to localhost/);
});

test('loads in development without optional production variables', () => {
  const result = runConfig({
    NODE_ENV: 'development',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
  });
  assert.strictEqual(result.status, 0);
});
