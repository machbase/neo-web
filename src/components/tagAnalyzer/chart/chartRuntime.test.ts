import { createNewPanelInfo } from '../panel/panelModel';
import { resolveRuntimePanelChartConfig } from './chartRuntime';

describe('runtime panel chart config', () => {
    it('does not reject dormant settings on a disabled right axis', () => {
        const panelInfo = createNewPanelInfo([], 'Chart', 'Line');
        panelInfo.axes.rightY.valueRange = { min: 2, max: 1 };

        expect(() => resolveRuntimePanelChartConfig(panelInfo)).not.toThrow();
    });

    it('projects automatic and custom axis values without sharing ranges', () => {
        const panelInfo = createNewPanelInfo([], 'Chart', 'Line');
        panelInfo.axes.leftY.rawValueRange = { min: -5, max: 10 };
        panelInfo.axes.leftY.upperControlLimit = {
            enabled: false,
            value: undefined,
        };

        const axis = resolveRuntimePanelChartConfig(panelInfo).axes.leftY;

        expect(axis).toMatchObject({
            valueRange: { min: undefined, max: undefined },
            rawValueRange: { min: -5, max: 10 },
            upperControlLimit: { enabled: false, value: 0 },
        });
        expect(axis.valueRange).not.toBe(panelInfo.axes.leftY.valueRange);
        expect(axis.rawValueRange).not.toBe(panelInfo.axes.leftY.rawValueRange);
    });
});
