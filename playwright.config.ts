import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';

const { host, ports: { vite } } = JSON.parse(
    readFileSync(
        new URL('./test_config/test-environment.json', import.meta.url),
        'utf8',
    ),
);
if (
    typeof host !== 'string' || !/^[a-z\d.-]+$/i.test(host) ||
    !Number.isInteger(vite) || vite < 1 || vite > 65_535
) {
    throw new TypeError('Invalid Playwright host or port.');
}

const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ??
    new URL(`http://${host}:${vite}`).origin;

export default defineConfig({
    testDir: './playwright_test',
    reporter: [
        ['./playwright_test/featureReporter.ts'],
    ],
    timeout: 20_000,

    use: {
        baseURL,
        actionTimeout: 5_000,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        launchOptions: {
            slowMo,
            ...(executablePath ? { executablePath } : {}),
        },
    },
});
