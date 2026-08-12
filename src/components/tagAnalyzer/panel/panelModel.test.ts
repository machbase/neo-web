import {
    createNewPanelInfo,
    hasInvalidAxesSettings,
    hasInvalidDataSettings,
    hasInvalidDisplaySettings,
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

describe('panel setting validation', () => {
    it('accepts the default settings', () => {
        const { axes, display } = createValidSettings();

        expect(hasInvalidAxesSettings(axes)).toBe(false);
        expect(hasInvalidDataSettings(display)).toBe(false);
        expect(hasInvalidDisplaySettings(display)).toBe(false);
    });

    it('validates both configured ranges on an active axis', () => {
        const { axes } = createValidSettings();
        axes.leftY.rawValueRange = { min: 1, max: 1 };

        expect(hasInvalidAxesSettings(axes)).toBe(true);
    });

    it('requires enabled control limits to contain finite values', () => {
        const { axes } = createValidSettings();
        axes.leftY.upperControlLimit = { enabled: true, value: undefined };

        expect(hasInvalidAxesSettings(axes)).toBe(true);

        axes.leftY.upperControlLimit.value = Number.NaN;
        expect(hasInvalidAxesSettings(axes)).toBe(true);

        axes.leftY.upperControlLimit.value = -10;
        expect(hasInvalidAxesSettings(axes)).toBe(false);
    });

    it('ignores invalid drafts on the disabled right axis', () => {
        const { axes } = createValidSettings();
        axes.rightY.valueRange = { min: 2, max: 1 };

        expect(hasInvalidAxesSettings(axes)).toBe(false);

        axes.rightY.enabled = true;
        expect(hasInvalidAxesSettings(axes)).toBe(true);
    });

    it.each(['mainChartSampling', 'rawNavigatorSampling'] as const)(
        'requires a finite positive count when %s is enabled',
        (field) => {
            const { display } = createValidSettings();
            display[field].enabled = true;

            for (const invalidCount of [
                undefined,
                0,
                -1,
                Number.NaN,
                Number.POSITIVE_INFINITY,
            ]) {
                display[field].sampleCount = invalidCount;
                expect(hasInvalidDataSettings(display)).toBe(true);
            }

            display[field].sampleCount = 0.5;
            expect(hasInvalidDataSettings(display)).toBe(false);
        },
    );

    it('ignores the count while sampling is disabled', () => {
        const { display } = createValidSettings();
        display.mainChartSampling = {
            enabled: false,
            sampleCount: Number.NaN,
        };

        expect(hasInvalidDataSettings(display)).toBe(false);
    });

    it.each(['calculated', 'calculatedNavigator'] as const)(
        'accepts automatic %s density and validates explicit values',
        (field) => {
            const { display } = createValidSettings();
            display.pixelsPerTick[field] = undefined;
            expect(hasInvalidDataSettings(display)).toBe(false);

            for (const invalidValue of [
                0,
                -1,
                Number.NaN,
                Number.POSITIVE_INFINITY,
            ]) {
                display.pixelsPerTick[field] = invalidValue;
                expect(hasInvalidDataSettings(display)).toBe(true);
            }

            display.pixelsPerTick[field] = 2;
            expect(hasInvalidDataSettings(display)).toBe(false);
        },
    );

    it.each(['pointRadius', 'fill', 'stroke'] as const)(
        'allows an omitted %s and rejects a non-finite value',
        (field) => {
            const { display } = createValidSettings();
            display[field] = undefined;
            expect(hasInvalidDisplaySettings(display)).toBe(false);

            display[field] = Number.NEGATIVE_INFINITY;
            expect(hasInvalidDisplaySettings(display)).toBe(true);

            display[field] = -1;
            expect(hasInvalidDisplaySettings(display)).toBe(false);
        },
    );
});
