/** Calendar date in the user's local timezone (matches dashboard "today" filters). */
export function localDayKey(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfLocalDay(value: Date = new Date()): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
