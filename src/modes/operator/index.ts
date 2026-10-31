import { defineMode } from '@kit/mode/manifest';
import { features } from './features.config';

export const manifest = defineMode({
  id: 'operator',
  title: 'Оператор',
  summary: 'Редактор листа: знаки, надписи, слои, печать',
  devices: ['phone', 'tablet', 'desktop'],
  features,
  load: () => import('./shell/Shell'),
});
