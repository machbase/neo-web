import type { PanelAxes, PanelSampling } from './PanelConfig';
import { resolvePanelAxesForRuntime } from './PanelRuntime';

const DEFAULT_SAMPLING: PanelSampling = {
    enabled: false,
    sampleCount: undefined,
};

function createAxes(): PanelAxes {
    const sYAxis = {
        zeroBase: false,
        showTickline: true,
        valueRange: {
            min: undefined,
            max: undefined,
        },
        rawValueRange: {
            min: undefined,
            max: undefined,
        },
        upperControlLimit: {
            enabled: false,
            value: undefined,
        },
        lowerControlLimit: {
            enabled: false,
            value: undefined,
        },
    };

    return {
        x: {
            showTickline: true,
        },
        leftY: sYAxis,
        rightY: {
            ...sYAxis,
            enabled: false,
        },
    };
}

describe('resolvePanelAxesForRuntime', () => {
    it('keeps undefined y-axis value ranges as auto', () => {
        const sRuntimeAxes = resolvePanelAxesForRuntime(
            createAxes(),
            {
                raw: 1,
                calculated: 1,
                calculatedNavigator: 1,
            },
            DEFAULT_SAMPLING,
        );

        expect(sRuntimeAxes.leftY.valueRange).toEqual({
            min: undefined,
            max: undefined,
        });
    });

    it('rejects 0/0 y-axis value ranges at runtime', () => {
        const sAxes = createAxes();
        sAxes.leftY.valueRange = {
            min: 0,
            max: 0,
        };

        expect(() =>
            resolvePanelAxesForRuntime(
                sAxes,
                {
                    raw: 1,
                    calculated: 1,
                    calculatedNavigator: 1,
                },
                DEFAULT_SAMPLING,
            ),
        ).toThrow('left y-axis value range min must be less than max.');
    });
});