import { defineMode } from '@kit/mode/manifest';
import { features } from './features.config';

export const manifest = defineMode({
  id: 'maket',
  title: 'Макет',
  summary: '3D-макет местности: рельеф, здания, сценарии',
  devices: ['phone', 'tablet', 'desktop'],
  features,
  load: () => import('./shell/Shell'),
});
