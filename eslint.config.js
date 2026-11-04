import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

/*
 * Code style: rules, not a formatter. Base is the @stylistic "customize" preset, adjusted towards
 * Airbnb. Where a rule can either enforce a layout or only consistency, it enforces consistency:
 * the author decides whether arguments or properties go on one line or one per line, the linter
 * only forbids mixing the two. There is no maximum line length. `npm run lint -- --fix` fixes
 * almost everything automatically.
 */
const stylisticBase = stylistic.configs.customize({
  indent: 2,
  quotes: 'single',
  semi: true,
  jsx: true,
  braceStyle: '1tbs',
  commaDangle: 'always-multiline',
  arrowParens: true,
});

const styleRules = {
  ...stylisticBase.rules,

  // Single quotes; double only to avoid escaping ("it's"). JSX attributes use double quotes.
  '@stylistic/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: 'avoidEscape' }],
  // Object keys are quoted only when required: { a: 1, 'error-codes': [] }.
  '@stylistic/quote-props': ['error', 'as-needed'],

  // Arguments, parameters, properties, elements: all on one line or one per line, never mixed.
  '@stylistic/function-call-argument-newline': ['error', 'consistent'],
  '@stylistic/function-paren-newline': ['error', 'consistent'],
  '@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
  '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
  '@stylistic/array-bracket-newline': ['error', 'consistent'],
  '@stylistic/array-element-newline': ['error', 'consistent'],

  // One statement per line. Bodies of if/else and loops always start on a new line (see `curly`).
  '@stylistic/max-statements-per-line': ['error', { max: 1 }],
  '@stylistic/curly-newline': ['error', {
    consistent: true,
    IfStatementConsequent: 'always',
    IfStatementAlternative: 'always',
    ForStatement: 'always',
    ForInStatement: 'always',
    ForOfStatement: 'always',
    WhileStatement: 'always',
    DoWhileStatement: 'always',
  }],
  // Operators start the continuation line (&&, ||, +, ?:); assignments never break around "=".
  '@stylistic/operator-linebreak': ['error', 'before', { overrides: { '=': 'none' } }],

  '@stylistic/implicit-arrow-linebreak': ['error', 'beside'],
  '@stylistic/nonblock-statement-body-position': ['error', 'beside'],
  '@stylistic/newline-per-chained-call': ['error', { ignoreChainWithDepth: 4 }],
  '@stylistic/no-confusing-arrow': ['error', { allowParens: true }],
  '@stylistic/linebreak-style': ['error', 'unix'],

  // JSX: with more than one prop, every prop goes on its own line, the first one included.
  '@stylistic/jsx-max-props-per-line': ['error', { maximum: 1, when: 'always' }],
  '@stylistic/jsx-first-prop-new-line': ['error', 'multiprop'],
  '@stylistic/jsx-self-closing-comp': 'error',
  '@stylistic/jsx-pascal-case': ['error', { allowAllCaps: true }],
};

// Airbnb practices that are not about formatting.
const practiceRules = {
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'prefer-const': 'error',
  'no-var': 'error',
  'object-shorthand': 'error',
  'prefer-template': 'error',
  'no-nested-ternary': 'error',
  curly: ['error', 'all'],
  'no-else-return': ['error', { allowElseIf: false }],
  'dot-notation': 'error',
  'prefer-arrow-callback': 'error',
  'arrow-body-style': ['error', 'as-needed'],
  'no-useless-concat': 'error',
  'no-useless-return': 'error',
  radix: 'error',
  'no-param-reassign': ['error', { props: false }],
  'no-plusplus': 'error',
};

// Planner grid boundaries, see src/components/TimelineGrid/README.md: desktop/ and mobile/ never
// import each other, shared/ imports neither, and no part of the grid detects the device itself.
const GRID_DEVICE_DETECTION = {
  group: ['**/useMobileWidgetLayout', '**/Planner/Planner'],
  message: 'The grid must not detect the device; Planner picks the desktop or mobile view.',
};
const gridBoundary = (folder, forbidden) => ({
  files: [`src/components/TimelineGrid/${folder}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        ...forbidden.map((other) => ({
          group: [`../${other}`, `../${other}/*`],
          message: `TimelineGrid/${folder} must not depend on TimelineGrid/${other}.`,
        })),
        GRID_DEVICE_DETECTION,
      ],
    }],
  },
});

export default defineConfig([
  globalIgnores(['dist', '.vite', 'worker-configuration.d.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Style applies to everything we write: app, Worker, tests and config files.
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { '@stylistic': stylistic },
    rules: { ...styleRules, ...practiceRules },
  },
  gridBoundary('desktop', ['mobile']),
  gridBoundary('mobile', ['desktop']),
  gridBoundary('shared', ['desktop', 'mobile']),
]);
