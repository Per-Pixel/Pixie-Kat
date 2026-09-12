import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', '..', '..', 'supabase', 'migrations');

// Collect every CREATE POLICY across migrations: policies[table][command] = [name, ...]
const policies = {};
for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  const pattern = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.(\w+)\s+FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)/gi;
  for (const match of sql.matchAll(pattern)) {
    const [, name, table, command] = match;
    (policies[table] ??= {})[command.toUpperCase()] ??= [];
    policies[table][command.toUpperCase()].push(name);
  }
}

const hasPolicy = (table, command) =>
  assert.ok(
    policies[table]?.[command]?.length,
    `${table} is missing a ${command} policy`
  );

test('user_kyc allows admin read, update, and insert', () => {
  hasPolicy('user_kyc', 'SELECT');
  hasPolicy('user_kyc', 'UPDATE');
  hasPolicy('user_kyc', 'INSERT');
});

test('settings tables allow admin insert and update', () => {
  for (const table of [
    'store_settings',
    'admin_notification_settings',
    'admin_security_settings',
  ]) {
    hasPolicy(table, 'SELECT');
    hasPolicy(table, 'INSERT');
    hasPolicy(table, 'UPDATE');
  }
});
