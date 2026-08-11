import {
    createNewPanelInfo,
    hasInvalidPanelSettings,
    isValueRangeInvalid,
} from './panelModel';

function createValidSettings() {
    const panelInfo = createNewPanelInfo([], 'Test panel', 'Line');
    return { axes: panelInfo.axes, display: panelInfo.display };
}

describe('isValueRangeInvalid', () => {
    it.each([
        [{ min: undefined, max: undefined }, false],
        [{ min: 0, max: 1 }, false],
        [{ min: undefined, max: 1 }, true],
        [{ min: 0, max: undefined }, true],
        [{ min: Number.NaN, max: 1 }, true],
        [{ min: 0, max: Number.POSITIVE_INFINITY }, true],
        [{ min: 1, max: 1 }, true],
        [{ min: 2, max: 1 }, true],
    ])('validates %o as invalid=%s', (range, expected) => {
        expect(isValueRangeInvalid(range)).toBe(expected);
    });
});

describe('hasInvalidPanelSettings', () => {
    it('accepts the default settings', () => {
        const { axes, display } = createValidSettings();

        expect(hasInvalidPanelSettings(axes, display)).toBe(false);
    });

    it('validates both configured ranges on an active axis', () => {
        const { axes, display } = createValidSettings();
        axes.leftY.rawValueRange = { min: 1, max: 1 };

        expect(hasInvalidPanelSettings(axes, display)).toBe(true);
    });

    it('requires enabled control limits to contain finite values', () => {
        const { axes, display } = createValidSettings();
        axes.leftY.upperControlLimit = { enabled: true, value: undefined };

        expect(hasInvalidPanelSettings(axes, display)).toBe(true);

        axes.leftY.upperControlLimit.value = Number.NaN;
        expect(hasInvalidPanelSettings(axes, display)).toBe(true);

        axes.leftY.upperControlLimit.value = -10;
        expect(hasInvalidPanelSettings(axes, display)).toBe(false);
    });

    it('ignores invalid drafts on the disabled right axis', () => {
        const { axes, display } = createValidSettings();
        axes.rightY.valueRange = { min: 2, max: 1 };

        expect(hasInvalidPanelSettings(axes, display)).toBe(false);

        axes.rightY.enabled = true;
        expect(hasInvalidPanelSettings(axes, display)).toBe(true);
    });

    it.each(['mainChartSampling', 'rawNavigatorSampling'] as const)(
        'requires a finite positive count when %s is enabled',
        (field) => {
            const { axes, display } = createValidSettings();
            display[field].enabled = true;

            for (const invalidCount of [
                undefined,
                0,
                -1,
                Number.NaN,
                Number.POSITIVE_INFINITY,
            ]) {
                display[field].sampleCount = invalidCount;
                expect(hasInvalidPanelSettings(axes, display)).toBe(true);
            }

            display[field].sampleCount = 0.5;
            expect(hasInvalidPanelSettings(axes, display)).toBe(false);
        },
    );

    it('ignores the count while sampling is disabled', () => {
        const { axes, display } = createValidSettings();
        display.mainChartSampling = {
            enabled: false,
            sampleCount: Number.NaN,
        };

        expect(hasInvalidPanelSettings(axes, display)).toBe(false);
    });

    it.each(['calculated', 'calculatedNavigator'] as const)(
        'accepts automatic %s density and validates explicit values',
        (field) => {
            const { axes, display } = createValidSettings();
            display.pixelsPerTick[field] = undefined;
            expect(hasInvalidPanelSettings(axes, display)).toBe(false);

            for (const invalidValue of [
                0,
                -1,
                Number.NaN,
                Number.POSITIVE_INFINITY,
            ]) {
                display.pixelsPerTick[field] = invalidValue;
                expect(hasInvalidPanelSettings(axes, display)).toBe(true);
            }

            display.pixelsPerTick[field] = 2;
            expect(hasInvalidPanelSettings(axes, display)).toBe(false);
        },
    );

    it.each(['pointRadius', 'fill', 'stroke'] as const)(
        'allows an omitted %s and rejects a non-finite value',
        (field) => {
            const { axes, display } = createValidSettings();
            display[field] = undefined;
            expect(hasInvalidPanelSettings(axes, display)).toBe(false);

            display[field] = Number.NEGATIVE_INFINITY;
            expect(hasInvalidPanelSettings(axes, display)).toBe(true);

            display[field] = -1;
            expect(hasInvalidPanelSettings(axes, display)).toBe(false);
        },
    );
});
