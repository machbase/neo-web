import { defineConfig } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const platform = process.platform === 'win32' ? 'win'
    : process.platform === 'linux' ? 'linux'
    : process.platform === 'darwin' ? 'mac' : undefined;
if (!platform) throw new Error(`Unsupported test platform: ${process.platform}`);
const setupCommand = platform === 'win'
    ? '.\\test_config\\win\\test_env_config_win.ps1'
    : `bash ./test_config/${platform}/test_env_config_${platform}.sh`;
const { host, paths: { temporaryData }, ports: { http, vite } } = JSON.parse(
    readFileSync(
        new URL(`./test_config/${platform}/test_env_${platform}.json`, import.meta.url),
        'utf8',
    ),
);
if (
    typeof host !== 'string' || !/^[a-z\d.-]+$/i.test(host) ||
    ![http, vite].every((port) => Number.isInteger(port) && port >= 1 && port <= 65_535) ||
    typeof temporaryData !== 'string' || temporaryData.trim() === ''
) {
    throw new TypeError('Invalid Playwright host, port, or temporary-data path.');
}

const expandedTemporaryData = temporaryData.replace(
    /%([A-Za-z_]\w*)%|\$\{([A-Za-z_]\w*)\}|\$([A-Za-z_]\w*)/g,
    (_: string, windowsName: string, bracedName: string, unixName: string) => {
        const name = windowsName ?? bracedName ?? unixName;
        const value = name === 'TMPDIR' ? tmpdir()
            : name === 'HOME' ? homedir() : process.env[name];
        if (value === undefined) throw new Error(`Unset path environment variable: ${name}`);
        return value;
    },
);
const temporaryDataPath = resolve(
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
            `Run ${setupCommand} first.`,
        );
    }
}

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
