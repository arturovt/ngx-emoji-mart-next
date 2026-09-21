const { defineConfig } = require('eslint/config');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
  },
]);
