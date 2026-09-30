import { describe, it, expect } from 'vitest';
import {
  getMenuScrollState,
  getMenuCardPose,
  getMenuParallax,
} from './menuDeck';

describe('getMenuScrollState', () => {
  it('maps progress bounds onto card positions', () => {
    expect(getMenuScrollState(0, 6)).toEqual({ progress: 0, position: 0, activeIndex: 0 });
    expect(getMenuScrollState(0.2, 6)).toEqual({ progress: 0.2, position: 1, activeIndex: 1 });
    expect(getMenuScrollState(0.4, 6).activeIndex).toBe(2);
    expect(getMenuScrollState(1, 6)).toEqual({ progress: 1, position: 5, activeIndex: 5 });
  });

  it('clamps out-of-range and non-finite progress', () => {
    expect(getMenuScrollState(-1, 6).position).toBe(0);
    expect(getMenuScrollState(2, 6).position).toBe(5);
    expect(getMenuScrollState(NaN, 6).position).toBe(0);
  });

  it('handles degenerate counts', () => {
    for (const count of [0, 1, -2, NaN]) {
      expect(getMenuScrollState(0.7, count).position).toBe(0);
    }
  });

  it('rounds the active index at midpoints', () => {
    expect(getMenuScrollState(0.099, 6).activeIndex).toBe(0);
    expect(getMenuScrollState(0.101, 6).activeIndex).toBe(1);
  });
});

describe('getMenuCardPose', () => {
  it('mirrors neighbouring cards around the active position', () => {
    const halfway = getMenuScrollState(0.1, 6).position;
    const oldCard = getMenuCardPose(-halfway);
    const nextCard = getMenuCardPose(1 - halfway);
    expect(oldCard.xPercent).toBeLessThan(0);
    expect(nextCard.xPercent).toBeGreaterThan(0);
    expect(oldCard.scale).toBeCloseTo(nextCard.scale);
    expect(oldCard.opacity).toBeGreaterThan(0);
    expect(nextCard.opacity).toBeGreaterThan(0);
  });

  it('keeps the focused card largest and nearest', () => {
    expect(getMenuCardPose(0).scale).toBeGreaterThan(getMenuCardPose(-1).scale);
    expect(getMenuCardPose(0).z).toBeGreaterThan(getMenuCardPose(1).z);
  });

  it('keeps both neighbours partially visible', () => {
    expect(getMenuCardPose(1).opacity).toBeGreaterThan(0);
    expect(getMenuCardPose(-1).opacity).toBeGreaterThan(0);
  });

  it('is continuous across pose boundaries', () => {
    for (const boundary of [-2, -1, 0, 1, 2]) {
      for (const key of ['xPercent', 'yPercent', 'z', 'scale', 'rotation', 'rotationY', 'opacity']) {
        expect(
          Math.abs(getMenuCardPose(boundary - 0.00001)[key] - getMenuCardPose(boundary + 0.00001)[key])
        ).toBeLessThan(0.01);
      }
    }
  });

  it('clamps offsets beyond the deck edges', () => {
    expect(getMenuCardPose(10)).toEqual(getMenuCardPose(3));
    expect(getMenuCardPose(-10)).toEqual(getMenuCardPose(-3));
  });

  it('returns to identical poses at identical scroll positions', () => {
    const frozen = [0, 0.3, 0.8, 0.2, 0].map((p) => ({
      state: getMenuScrollState(p, 6),
      pose: getMenuCardPose(1 - getMenuScrollState(p, 6).position),
    }));
    expect(frozen[0]).toEqual(frozen[4]);
  });

  it('collapses to a flat opacity crossfade when reduced', () => {
    for (const offset of [-2, -0.5, 0, 0.5, 2]) {
      const pose = getMenuCardPose(offset, true);
      expect(pose.xPercent).toBe(0);
      expect(pose.rotationY).toBe(0);
      expect(pose.scale).toBe(1);
    }
    expect(getMenuCardPose(0.5, true).opacity).toBe(0.5);
  });
});

describe('getMenuParallax', () => {
  it('is neutral at the viewport centre', () => {
    expect(getMenuParallax(500, 400, 1000, 800)).toEqual({
      x: 0,
      y: 0,
      rotationX: 0,
      rotationY: 0,
      rotation: 0,
    });
  });

  it('clamps at the configured travel limits', () => {
    expect(getMenuParallax(1000, 400, 1000, 800).x).toBe(15);
    const edge = getMenuParallax(5000, -5000, 1000, 800);
    expect(edge.x).toBe(15);
    expect(edge.y).toBe(-10);
    expect(Math.abs(edge.rotationY)).toBeLessThanOrEqual(1.2);
  });
});
