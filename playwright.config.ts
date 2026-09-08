import { defineConfig } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { host, paths: { temporaryData }, ports: { vite } } = JSON.parse(
    readFileSync(
        new URL('./test_config/test-environment.json', import.meta.url),
        'utf8',
    ),
);
if (
    typeof host !== 'string' || !/^[a-z\d.-]+$/i.test(host) ||
    !Number.isInteger(vite) || vite < 1 || vite > 65_535 ||
    typeof temporaryData !== 'string' || temporaryData.trim() === ''
) {
    throw new TypeError('Invalid Playwright host, port, or temporary-data path.');
}

const expandedTemporaryData = temporaryData.replace(
    /%([^%]+)%/g,
    (match: string, name: string) => process.env[name] ?? match,
);
const temporaryDataPath = isAbsolute(expandedTemporaryData)
    ? expandedTemporaryData
    : resolve(
        fileURLToPath(new URL('./test_config/', import.meta.url)),
        expandedTemporaryData,
    );
const fileStoragePath = resolve(temporaryDataPath, 'files');

if (!process.argv.includes('--list')) {
    try {
        if (!statSync(fileStoragePath).isDirectory()) throw new Error();
    } catch {
        throw new Error(
            `Test file storage is unavailable at ${fileStoragePath}. ` +
            'Run .\\test_config\\configure-test-environment.ps1 first.',
        );
    }
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
    timeout: 30_000,
    workers: 2,

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
