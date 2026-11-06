/**
 * Commit messages follow Conventional Commits: "type(scope): summary", see README → Commits.
 * Checked by the commit-msg hook (.husky/commit-msg) and in CI.
 */
const SCOPES = [
  // Widgets and pages
  'cities',
  'planner',
  'converter',
  'home',
  'legal',
  // Shared parts
  'ui',
  'i18n',
  'seo',
  'settings',
  // Worker and data
  'server',
  'contact',
  'data',
  // Tooling
  'deps',
  'lint',
];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', SCOPES],
  },
};
