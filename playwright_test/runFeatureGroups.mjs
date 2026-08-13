import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const playwrightCli = require.resolve('@playwright/test/cli');
const forwardedArguments = process.argv.slice(2);

const featureGroups = [
    ['LOGIN', 'playwright_test/login'],
    ['BASIC', 'playwright_test/tagAnalyzer/basic'],
    ['FFT', 'playwright_test/tagAnalyzer/fft'],
    ['HIGHLIGHT & ANNOTATION', 'playwright_test/tagAnalyzer/markup'],
    ['OVERLAP', 'playwright_test/tagAnalyzer/overlap'],
    ['PANEL EDITOR', 'playwright_test/tagAnalyzer/editor'],
    ['PANEL', 'playwright_test/tagAnalyzer/panel'],
    ['POPUP', 'playwright_test/tagAnalyzer/popup'],
    ['RANGE', 'playwright_test/tagAnalyzer/range'],
    ['SAVE & PERSISTENCE', 'playwright_test/tagAnalyzer/save'],
    ['TAG ANALYZER', 'playwright_test/tagAnalyzer/tagAnalyzer.spec.ts'],
];

const failedFeatures = [];

for (const [featureName, testPath] of featureGroups) {
    process.stdout.write(`\n${featureName} TEST START\n\n`);

    const result = spawnSync(
        process.execPath,
        [playwrightCli, 'test', testPath, '--reporter=list', ...forwardedArguments],
        {
            cwd: repositoryRoot,
            env: process.env,
            stdio: 'inherit',
        },
    );

    if (result.error) throw result.error;

    if (result.status === 0) {
        process.stdout.write(`\n${featureName} TEST COMPLETE\n`);
    } else {
        failedFeatures.push(featureName);
        process.stdout.write(`\n${featureName} TEST FAILED\n`);
    }
}

if (failedFeatures.length > 0) {
    process.stdout.write(`\nFailed feature groups: ${failedFeatures.join(', ')}\n`);
    process.exitCode = 1;
}
