import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Lint is for what a type checker cannot see.
//
// It is NOT where module boundaries live: those are `pnpm drift`, which works on the real
// dependency graph and can prove that each of its rules still catches a violation. An import
// rule inside a linter cannot prove anything about itself.
export default [
  {
    ignores: [
      'node_modules/**',
      // Every package's tsc output, not only the root's: declarations Drizzle's inferred types
      // produce in packages/domain/dist are generated, and never source anyone wrote.
      '**/dist/**',
      '.artifacts/**',
      '.tmp/**',
      'steering-ref/**',
      'db/migrations/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // A stand-in provider and a real one must be distinguishable; an unused import
      // usually means one was swapped out and the other left behind.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
    },
  },
  {
    // The dependency-cruiser config is the one CommonJS file here, because that is the format
    // the tool loads.
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.commonjs },
    },
  },
]
