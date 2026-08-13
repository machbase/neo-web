import type {
    FullConfig,
    Reporter,
    Suite,
    TestCase,
} from '@playwright/test/reporter';

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
    printsToStdio(): boolean {
        return true;
    }

    onBegin(_config: FullConfig, suite: Suite): void {
        const featureCounts = new Map<string, number>();
        for (const test of suite.allTests()) {
            const feature = getFeatureName(test);
            featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + 1);
        }

        writeLine('');
        writeLine('Feature groups:');
        for (const [feature, count] of [...featureCounts.entries()].sort()) {
            writeLine(`  ${feature.padEnd(24)} ${count} ${pluralizeTest(count)}`);
        }
        writeLine('');
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

function pluralizeTest(count: number): string {
    return count === 1 ? 'test' : 'tests';
}

function writeLine(value: string): void {
    process.stdout.write(`${value}\n`);
}
