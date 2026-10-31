import { describe, expect, it } from 'vitest';
import { classifyDevice } from './device';

describe('класс устройства', () => {
  it('мышь — ПК', () => expect(classifyDevice({ coarsePointer: false, shortSide: 400 })).toBe('desktop'));
  it('палец и узкий экран — телефон', () =>
    expect(classifyDevice({ coarsePointer: true, shortSide: 390 })).toBe('phone'));
  it('палец и широкий экран — планшет', () =>
    expect(classifyDevice({ coarsePointer: true, shortSide: 820 })).toBe('tablet'));
});
