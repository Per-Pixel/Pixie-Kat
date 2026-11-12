export type AdminPeriod = 'today' | '7d' | '30d' | '90d' | '6m' | '1y' | 'all' | 'custom';

export const ADMIN_PERIOD_OPTIONS: Array<{ value: AdminPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'Lifetime' },
  { value: 'custom', label: 'Custom' },
];

/** Same inclusive start / end as `get_admin_analytics` (7d = today + previous 6 days, etc.). */
export function adminPeriodWindow(
  period: AdminPeriod,
  customStart = '',
  customEnd = '',
  now = new Date(),
): { start: Date | null; end: Date } {
  if (period === 'all') return { start: null, end: now };

  const end =
    period === 'custom' && customEnd ? new Date(`${customEnd}T23:59:59.999`) : now;

  let start: Date | null = null;
  if (period === 'custom' && customStart) start = new Date(`${customStart}T00:00:00`);
  if (period === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === '7d') start = new Date(now.getTime() - 6 * 86_400_000);
  if (period === '30d') start = new Date(now.getTime() - 29 * 86_400_000);
  if (period === '90d') start = new Date(now.getTime() - 89 * 86_400_000);
  if (period === '6m') {
    start = new Date(now);
    start.setMonth(start.getMonth() - 6);
  }
  if (period === '1y') start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  return { start, end };
}

export function matchesAdminPeriod(
  ts: string | null | undefined,
  period: AdminPeriod,
  customStart = '',
  customEnd = '',
): boolean {
  if (period === 'all') return true;
  if (!ts) return false;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return false;

  const { start, end } = adminPeriodWindow(period, customStart, customEnd);
  if (start && date < start) return false;
  if (date > end) return false;
  return true;
}

/** Inclusive start and end for a dashboard period. Null means unbounded. */
export function adminPeriodBounds(
  period: AdminPeriod,
  customStart = '',
  customEnd = '',
  now = new Date(),
): { start: string | null; end: string | null } {
  const { start, end } = adminPeriodWindow(period, customStart, customEnd, now);
  if (period === 'all') return { start: null, end: null };
  return {
    start: start?.toISOString() ?? null,
    end: period === 'custom' && customEnd ? end.toISOString() : null,
  };
}

export function exportToCsv(
  filenamePrefix: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
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
