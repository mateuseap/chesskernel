import { describe, it, expect } from 'vitest';
import { cn, formatMs } from './utils';

describe('cn', () => {
  it('joins class names and drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });

  it('lets the last conflicting tailwind class win', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-muted-foreground', 'text-foreground')).toBe('text-foreground');
  });

  it('supports conditional object syntax', () => {
    expect(cn({ 'bg-muted': true, hidden: false })).toBe('bg-muted');
  });
});

describe('formatMs', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatMs(65_000)).toBe('1:05');
    expect(formatMs(600_000)).toBe('10:00');
  });

  it('floors partial seconds', () => {
    expect(formatMs(59_999)).toBe('0:59');
  });

  it('clamps negative values to 0:00', () => {
    expect(formatMs(-5_000)).toBe('0:00');
    expect(formatMs(0)).toBe('0:00');
  });
});
