import { describe, expect, it } from 'vitest';
import {
  buildPixieKatOrderContext,
  formatAccountTarget,
  getOrderCustomer,
  type EnrichedOrderRow,
} from './ChatGptAssistantDrawer';

const sampleOrder: EnrichedOrderRow = {
  id: '6152446d-1234-5678-9abc-def012345678',
  user_id: '607003f0-0000-0000-0000-000000000000',
  product_name: 'BGMI 325 UC Pack',
  quantity: 1,
  total_amount: 395,
  unit_cost_price: 340,
  currency: 'PKS',
  status: 'processing',
  payment_method: 'wallet',
  resolvedGameName: 'BGMI (Not Instant)',
  resolvedProvider: 'manual',
  isManualOrder: true,
  metadata: {
    account_fields: { character_id: '518293012', server: 'India' },
    verified_username: 'PixieSlayer',
    contact: { email: 'player@example.com', whatsapp: '+919999999999' },
    manual_fulfillment_note: 'Priority manual top-up',
  },
  profiles: [{ id: '607003f0', name: 'Aarav Sharma', email: 'aarav@example.com' }],
  created_at: '2026-10-26T10:00:00.000Z',
  updated_at: '2026-10-26T10:05:00.000Z',
};

describe('ChatGptAssistantDrawer context helpers', () => {
  it('extracts customer details from array or object profile shapes', () => {
    expect(getOrderCustomer(sampleOrder)).toEqual({
      name: 'Aarav Sharma',
      email: 'aarav@example.com',
    });

    expect(
      getOrderCustomer({
        ...sampleOrder,
        profiles: { name: 'Single Profile', email: 'single@example.com' },
      })
    ).toEqual({
      name: 'Single Profile',
      email: 'single@example.com',
    });
  });

  it('formats player target account fields cleanly', () => {
    expect(formatAccountTarget(sampleOrder)).toBe('character_id: 518293012 · server: India');
    expect(formatAccountTarget({ ...sampleOrder, metadata: {} })).toBe('No target UID');
  });

  it('builds a structured PixieKat context payload and respects PII toggle', () => {
    const fullContext = buildPixieKatOrderContext({
      selectedOrders: [sampleOrder],
      allVisibleOrders: [sampleOrder],
      workspaceTitle: 'Manual Orders',
      activeFolderLabel: 'Manual Fulfillment Queue',
      toggles: {
        includeStoreRules: true,
        includeQueueSummary: true,
        includeSelectedOrders: true,
        includeCustomerPii: true,
      },
    });

    expect(fullContext).toContain('## PixieKat Store & Operations Context');
    expect(fullContext).toContain('## Live Workspace Summary (Manual Orders — Folder: Manual Fulfillment Queue)');
    expect(fullContext).toContain('Order #6152446D');
    expect(fullContext).toContain('character_id: 518293012 · server: India');
    expect(fullContext).toContain('Aarav Sharma <aarav@example.com>');
    expect(fullContext).toContain('Priority manual top-up');

    const redactedContext = buildPixieKatOrderContext({
      selectedOrders: [sampleOrder],
      allVisibleOrders: [sampleOrder],
      workspaceTitle: 'Manual Orders',
      toggles: {
        includeStoreRules: false,
        includeQueueSummary: false,
        includeSelectedOrders: true,
        includeCustomerPii: false,
      },
    });

    expect(redactedContext).not.toContain('Aarav Sharma');
    expect(redactedContext).toContain('[Redacted by toggle]');
  });
});
