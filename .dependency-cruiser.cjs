/** Правила уровней СКАТ 2.0 (docs/ARCHITECTURE.md §3). Нарушение = красная сборка. */
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', comment: 'Циклы запрещены', from: {}, to: { circular: true } },
    {
      name: 'core-isolated',
      severity: 'error',
      comment: 'core — чистая логика и ни от чего не зависит',
      from: { path: '^src/core/' },
      to: { path: '^src/(platform|kit|modes|app)/' },
    },
    {
      name: 'platform-only-core',
      severity: 'error',
      comment: 'platform зависит только от core',
      from: { path: '^src/platform/' },
      to: { path: '^src/(kit|modes|app)/' },
    },
    {
      name: 'kit-no-modes',
      severity: 'error',
      comment: 'kit не знает о режимах и приложении',
      from: { path: '^src/kit/' },
      to: { path: '^src/(modes|app)/' },
    },
    {
      name: 'modes-independent',
      severity: 'error',
      comment: 'Режимы не импортируют друг друга; обмен — только через kit/exchange',
      from: { path: '^src/modes/([^/]+)/' },
      to: { path: '^src/modes/', pathNot: '^src/modes/$1/' },
    },
    {
      name: 'modes-no-app',
      severity: 'error',
      comment: 'Режим не зависит от приложения',
      from: { path: '^src/modes/' },
      to: { path: '^src/app/' },
    },
    {
      name: 'app-modes-via-index',
      severity: 'error',
      comment: 'Приложение обращается к режиму только через его index.ts',
      from: { path: '^src/app/' },
      to: { path: '^src/modes/[^/]+/', pathNot: '^src/modes/[^/]+/index\\.ts$' },
    },
    {
      name: 'no-test-imports',
      severity: 'error',
      comment: 'Рабочий код не импортирует тесты',
      from: { pathNot: '\\.test\\.ts$' },
      to: { path: '\\.test\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.ts', '.tsx', '.js'],
    },
  },
};
