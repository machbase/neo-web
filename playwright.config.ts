import { defineConfig } from '@playwright/test';

const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 1000);

export default defineConfig({
    testDir: './playwright_test',
    reporter: [
        ['./playwright_test/reporters/featureReporter.ts'],
        ['list'],
    ],
    timeout: 60_000,

    use: {
        launchOptions: {
            slowMo,
            ...(executablePath ? { executablePath } : {}),
        },
    },
});
