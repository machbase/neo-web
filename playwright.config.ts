import { defineConfig } from '@playwright/test';

const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
    testDir: './playwright_test',
    reporter: './playwright_test/reporters/featureReporter.ts',
    timeout: 60_000,

    use: {
        launchOptions: {
            slowMo: 1000,
            ...(executablePath ? { executablePath } : {}),
        },
    },
});
