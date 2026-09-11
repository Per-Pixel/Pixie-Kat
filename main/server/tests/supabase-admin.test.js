import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
delete process.env.SUPER_ADMIN_IDS;
delete process.env.SUPER_ADMIN_EMAILS;

const { isSuperAdmin } = await import('../supabase-admin.js');

test('isSuperAdmin returns false when no super-admin env is set', () => {
  assert.strictEqual(isSuperAdmin({ id: '1', email: 'admin@pixiekat.com' }), false);
  assert.strictEqual(isSuperAdmin({ id: '2', email: 'someone@example.com' }), false);
});

test('isSuperAdmin matches by id', () => {
  process.env.SUPER_ADMIN_IDS = '1,2';
  assert.strictEqual(isSuperAdmin({ id: '1', email: 'a@b.com' }), true);
  assert.strictEqual(isSuperAdmin({ id: '3', email: 'c@d.com' }), false);
});

test('isSuperAdmin matches by email case-insensitively', () => {
  process.env.SUPER_ADMIN_EMAILS = 'Admin@Pixiekat.com';
  assert.strictEqual(isSuperAdmin({ id: '5', email: 'admin@pixiekat.com' }), true);
  assert.strictEqual(isSuperAdmin({ id: '6', email: 'other@example.com' }), false);
});
