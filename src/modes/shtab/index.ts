import { defineMode } from '@kit/mode/manifest';
import { features } from './features.config';

export const manifest = defineMode({
  id: 'shtab',
  title: 'Штаб',
  summary: 'Документы, учёт и расчёты',
  devices: ['phone', 'tablet', 'desktop'],
  features,
  load: () => import('./shell/Shell'),
});
