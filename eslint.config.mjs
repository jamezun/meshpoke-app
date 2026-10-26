import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.turbo/**', '**/node_modules/**', '**/*.generated.*', '**/openapi.json'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  // browser globals for web src; node globals for scripts/servers
  { files: ['apps/web/src/**/*.ts', 'apps/web/src/**/*.tsx'], languageOptions: { globals: globals.browser } },
  { files: ['**/*.mjs', 'apps/web/server.mjs'], languageOptions: { globals: globals.node } },
);
