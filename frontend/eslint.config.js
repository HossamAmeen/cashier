import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'src/api/schema.d.ts', 'src/api/schema.check.d.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error', // CLAUDE.md §6: no `any` (money code especially)
      'no-restricted-globals': [
        'error',
        { name: 'parseFloat', message: 'Use parseToMinor for money (ADR-0005).' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Number', property: 'parseFloat', message: 'Use parseToMinor for money (ADR-0005).' },
        { object: 'localStorage', property: 'setItem', message: 'Never persist tokens (ADR-0003).' },
      ],
    },
  },
);
