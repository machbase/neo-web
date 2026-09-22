import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';

const platform = process.platform === 'win32' ? 'win'
    : process.platform === 'linux' ? 'linux'
    : process.platform === 'darwin' ? 'mac' : undefined;
if (!platform) throw new Error(`Unsupported test platform: ${process.platform}`);
const { host, ports: { http, vite } } = JSON.parse(
    readFileSync(
        new URL(`./test_config/${platform}/test_env_${platform}.json`, import.meta.url),
        'utf8',
    ),
);
if (
    typeof host !== 'string' || !/^[a-z\d.-]+$/i.test(host) ||
    ![http, vite].every((port) => Number.isInteger(port) && port >= 1 && port <= 65_535)
) {
    throw new TypeError('Invalid Playwright host or port.');
}

// Tests access Neo storage through HTTP; the server may run in WSL or on another host.

const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ??
    new URL(`http://${host}:${vite}`).origin;
const apiBaseURL = process.env.PLAYWRIGHT_API_BASE_URL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    new URL(`http://${host}:${http}`).origin;

export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.ts',
    reporter: [
        ['./tests/featureReporter.ts'],
    ],
    timeout: 30_000,
    workers: 2,

    projects: [
        {
            name: 'integration',
            testDir: './tests/integration',
            use: { baseURL: apiBaseURL },
        },
        {
            name: 'e2e',
            testDir: './tests/e2e',
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
        },
    ],
});
