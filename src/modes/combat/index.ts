import { defineMode } from '@kit/mode/manifest';
import { features } from './features.config';

export const manifest = defineMode({
  id: 'combat',
  title: 'Боевой контур',
  summary: 'Обстановка, планирование и корректировка огня',
  devices: ['phone', 'tablet', 'desktop'],
  features,
  load: () => import('./shell/Shell'),
});
