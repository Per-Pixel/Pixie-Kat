export type AdminPeriod = 'today' | '7d' | '30d' | '90d' | '6m' | '1y' | 'all' | 'custom';

export const ADMIN_PERIOD_OPTIONS: Array<{ value: AdminPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '3 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'Lifetime' },
  { value: 'custom', label: 'Custom' },
];

export function matchesAdminPeriod(
  ts: string | null | undefined,
  period: AdminPeriod,
  customStart = '',
  customEnd = ''
): boolean {
  if (period === 'all') return true;
  if (!ts) return false;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();

  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return date >= start;
  }
  if (period === '7d') return date >= new Date(now.getTime() - 7 * 86_400_000);
  if (period === '30d') return date >= new Date(now.getTime() - 30 * 86_400_000);
  if (period === '90d') return date >= new Date(now.getTime() - 90 * 86_400_000);
  if (period === '6m') {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 6);
    return date >= start;
  }
  if (period === '1y') {
    return date >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
  if (period === 'custom') {
    if (customStart && date < new Date(`${customStart}T00:00:00`)) return false;
    if (customEnd && date > new Date(`${customEnd}T23:59:59.999`)) return false;
    return true;
  }
  return true;
}

export function exportToCsv(
  filenamePrefix: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): void {
  const escapeCell = (cell: string | number | null | undefined) =>
    `"${String(cell ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
