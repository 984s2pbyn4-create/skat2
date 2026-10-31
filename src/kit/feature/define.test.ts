import { describe, expect, it } from 'vitest';
import { defineFeature, missingRequires } from './define';

describe('манифест функции', () => {
  it('находит отсутствующие зависимости', () => {
    const a = defineFeature({ id: 'BK-11', title: 'Огневые задачи', requires: ['CORE-10'] });
    const b = defineFeature({ id: 'CORE-10', title: 'Карта' });
    expect(missingRequires([a])).toEqual(['BK-11 требует CORE-10']);
    expect(missingRequires([a, b])).toEqual([]);
  });
});
