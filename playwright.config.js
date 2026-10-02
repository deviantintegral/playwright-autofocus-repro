const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  projects: [{ name: 'webkit', use: { browserName: 'webkit' } }],
});
