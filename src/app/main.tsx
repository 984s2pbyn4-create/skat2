import { render } from 'preact';
import '@kit/ui/theme.css';
import '@kit/ui/ui.css';
import { App } from './App';
import { startRouter } from './router';

startRouter();
const root = document.getElementById('app');
if (root) render(<App />, root);
