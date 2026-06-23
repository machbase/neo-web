import { defineConfig } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
    testDir: './playwright_test',
    reporter: 'list',
    timeout: 60_000,
    use: executablePath
        ? {
              launchOptions: {
                  executablePath,
              },
          }
        : undefined,
});
