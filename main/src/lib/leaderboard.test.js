import { describe, expect, it } from 'vitest';
import { maskName, tierForRank, frameStyle, periodLabel, currentPeriod, rankForPeriod } from './leaderboard';

describe('rankForPeriod', () => {
  it('does not use a previous month as the current rank', () => {
    expect(rankForPeriod([{ period: '2026-08', rank: 4 }], '2026-09')).toBeNull();
  });

  it('finds the requested period even when history contains other months', () => {
    expect(rankForPeriod([{ period: '2026-09', rank: 2 }, { period: '2026-08', rank: 4 }], '2026-09')?.rank).toBe(2);
  });

  it('handles unavailable history', () => {
    expect(rankForPeriod(null, '2026-09')).toBeNull();
  });
});

describe('maskName', () => {
  it('prefers username over name', () => {
    expect(maskName('John Doe', 'pixiefan')).toBe('pixiefan');
  });

  it('masks full names when no username', () => {
    expect(maskName('Anakin Skywalker')).toBe('A***r');
    expect(maskName('Jo')).toBe('J***');
  });

  it('falls back to Player for empty values', () => {
    expect(maskName()).toBe('Player');
    expect(maskName('  ', '  ')).toBe('Player');
  });
});

describe('tierForRank', () => {
  const settings = {
    tiers: [
      { id: 'champion', min_rank: 1, max_rank: 1 },
      { id: 'diamond', min_rank: 2, max_rank: 3 },
      { id: 'gold', min_rank: 4, max_rank: 10 },
    ],
  };

  it('maps ranks to the matching tier', () => {
    expect(tierForRank(1, settings)?.id).toBe('champion');
    expect(tierForRank(3, settings)?.id).toBe('diamond');
    expect(tierForRank(10, settings)?.id).toBe('gold');
  });

  it('returns null outside all ranges', () => {
    expect(tierForRank(11, settings)).toBeNull();
    expect(tierForRank(1, null)).toBeNull();
    expect(tierForRank(1, { tiers: 'nope' })).toBeNull();
  });
});

describe('frameStyle', () => {
  it('returns known frames', () => {
    expect(frameStyle('champion').label).toBe('Champion');
    expect(frameStyle('gold').ring).toContain('amber');
  });

  it('falls back to a violet ring for unknown ids', () => {
    const style = frameStyle('mystery');
    expect(style.ring).toContain('violet');
    expect(style.label).toBe('mystery');
  });
});

describe('periodLabel', () => {
  it('renders YYYY-MM as a month name', () => {
    expect(periodLabel('2026-09')).toBe('September 2026');
  });

  it('passes through malformed input unchanged', () => {
    expect(periodLabel('not-a-period')).toBe('not-a-period');
    expect(periodLabel(null)).toBe('');
  });
});

describe('currentPeriod', () => {
  it('returns YYYY-MM', () => {
    expect(currentPeriod()).toMatch(/^\d{4}-\d{2}$/);
  });
});
