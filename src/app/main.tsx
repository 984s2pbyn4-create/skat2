import { render } from 'preact';
import '@kit/ui/fonts';
import '@kit/ui/theme.css';
import '@kit/ui/ui.css';
import './app.css';
import { registerServiceWorker } from '@platform/sw/register';
import { App } from './App';
import { startRouter } from './router';
import { boot } from './state';

registerServiceWorker();
startRouter();
const root = document.getElementById('app');
if (root) render(<App />, root);
void boot();
