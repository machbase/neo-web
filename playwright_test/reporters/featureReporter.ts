import type {
    FullConfig,
    FullResult,
    Reporter,
    Suite,
    TestCase,
    TestError,
    TestResult,
} from '@playwright/test/reporter';

type TestStatus = TestResult['status'];

type RecordedResult = {
    duration: number;
    feature: string;
    status: TestStatus;
};

const FEATURE_NAMES: Record<string, string> = {
    basic: 'BASIC',
    editor: 'PANEL EDITOR',
    fft: 'FFT',
    login: 'LOGIN',
    markup: 'HIGHLIGHT & ANNOTATION',
    overlap: 'OVERLAP',
    panel: 'PANEL',
    popup: 'POPUP',
    range: 'RANGE',
    save: 'SAVE & PERSISTENCE',
};

export default class FeatureReporter implements Reporter {
    private readonly results = new Map<string, RecordedResult>();

    printsToStdio(): boolean {
        return true;
    }

    onBegin(_config: FullConfig, suite: Suite): void {
        const featureCounts = new Map<string, number>();
        for (const test of suite.allTests()) {
            const feature = getFeatureName(test);
            featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + 1);
        }

        writeDivider();
        writeLine('PLAYWRIGHT TEST PLAN — GROUPED BY FEATURE');
        writeDivider();
        for (const [feature, count] of [...featureCounts.entries()].sort()) {
            writeLine(`${feature} FEATURE TESTING — ${count} ${pluralizeTest(count)}`);
        }
        writeDivider();
    }

    onTestBegin(test: TestCase): void {
        writeLine(`TEST START | ${getFeatureName(test)} FEATURE TESTING`);
        writeLine(`  ${test.title}`);
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        const feature = getFeatureName(test);
        this.results.set(test.id, {
            duration: result.duration,
            feature,
            status: result.status,
        });

        writeLine(
            `TEST ${getStatusLabel(result.status)} | ${feature} | ${test.title} (${formatDuration(result.duration)})`,
        );

        if (result.status === 'failed' || result.status === 'timedOut') {
            writeError(result.error);
        }
    }

    onError(error: TestError): void {
        writeError(error);
    }

    onEnd(result: FullResult): void {
        if (this.results.size === 0) return;

        const groupedResults = new Map<string, RecordedResult[]>();
        for (const recordedResult of this.results.values()) {
            const current = groupedResults.get(recordedResult.feature) ?? [];
            current.push(recordedResult);
            groupedResults.set(recordedResult.feature, current);
        }

        writeDivider();
        writeLine(`TEST RUN ${result.status.toUpperCase()} — FEATURE SUMMARY`);
        writeDivider();
        for (const [feature, results] of [...groupedResults.entries()].sort()) {
            const passed = results.filter(({ status }) => status === 'passed').length;
            const failed = results.filter(({ status }) =>
                status === 'failed' || status === 'timedOut'
            ).length;
            const skipped = results.filter(({ status }) => status === 'skipped').length;
            const duration = results.reduce(
                (total, recordedResult) => total + recordedResult.duration,
                0,
            );
            writeLine(
                `${feature}: ${passed} passed, ${failed} failed, ${skipped} skipped (${formatDuration(duration)})`,
            );
        }
        writeDivider();
    }
}

function getFeatureName(test: TestCase): string {
    const pathParts = test.location.file.replaceAll('\\', '/').split('/');
    const tagAnalyzerIndex = pathParts.lastIndexOf('tagAnalyzer');

    if (tagAnalyzerIndex >= 0) {
        const featureFolder = pathParts[tagAnalyzerIndex + 1];
        if (featureFolder && !featureFolder.endsWith('.spec.ts')) {
            return FEATURE_NAMES[featureFolder] ?? toDisplayName(featureFolder);
        }
        return 'TAG ANALYZER';
    }

    const testRootIndex = pathParts.lastIndexOf('playwright_test');
    const featureFolder = pathParts[testRootIndex + 1];
    return featureFolder
        ? FEATURE_NAMES[featureFolder] ?? toDisplayName(featureFolder)
        : 'GENERAL';
}

function toDisplayName(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[-_]/g, ' ')
        .toUpperCase();
}

function getStatusLabel(status: TestStatus): string {
    switch (status) {
        case 'passed':
            return 'PASS';
        case 'failed':
        case 'timedOut':
            return 'FAIL';
        case 'skipped':
            return 'SKIP';
        case 'interrupted':
            return 'INTERRUPTED';
    }
}

function writeError(error: TestError | undefined): void {
    if (!error) return;
    const details = error.stack ?? error.message ?? String(error);
    for (const line of details.split('\n')) {
        writeLine(`  ${line}`);
    }
}

function formatDuration(durationMs: number): string {
    if (durationMs < 1_000) return `${durationMs}ms`;
    return `${(durationMs / 1_000).toFixed(1)}s`;
}

function pluralizeTest(count: number): string {
    return count === 1 ? 'TEST' : 'TESTS';
}

function writeDivider(): void {
    writeLine('='.repeat(72));
}

function writeLine(value: string): void {
    process.stdout.write(`${value}\n`);
}
