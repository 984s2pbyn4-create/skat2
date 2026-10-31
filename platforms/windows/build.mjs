// Сборка EXE: веб-сборка → Electron → portable EXE. Запускается из windows.yml.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ELECTRON = '43.8.0';
const BUILDER = '26.17.0';

const root = process.cwd();
const run = (cmd, cwd = root) => execSync(cmd, { stdio: 'inherit', cwd });
const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));

run('npm ci --no-audit --no-fund');
run('npm run build');

const w = path.join(root, 'build-win');
fs.rmSync(w, { recursive: true, force: true });
fs.mkdirSync(w);
fs.cpSync(path.join(root, 'dist'), path.join(w, 'app'), { recursive: true });
fs.copyFileSync(path.join(root, 'platforms/windows/main.cjs'), path.join(w, 'main.cjs'));
const pkg = {
  name: 'skat2',
  version,
  description: 'СКАТ 2.0',
  author: 'il_klmv',
  main: 'main.cjs',
  build: {
    appId: 'ru.skat.skat2',
    productName: 'SKAT2',
    files: ['main.cjs', 'app/**/*'],
    win: { target: 'portable', icon: 'app/icon-512.png' },
    portable: { artifactName: `SKAT2-${version}.exe` },
    directories: { output: path.join(root, 'out') },
  },
};
fs.writeFileSync(path.join(w, 'package.json'), JSON.stringify(pkg, null, 2));
run(`npm i -D --save-exact electron@${ELECTRON} electron-builder@${BUILDER} --no-audit --no-fund`, w);
run('npx electron-builder --win portable --x64 --publish never', w);
console.log(`Готово: out/SKAT2-${version}.exe`);
