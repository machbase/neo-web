import { createNewPanelInfo } from '../../domain/panel/createPanelInfo';
import { buildLoadConfig } from './panelChartLoadConfig';

describe('buildLoadConfig', () => {
    it('keeps calculated data ordered while raw data defaults to unordered', () => {
        const panelInfo = createNewPanelInfo([], '', 'Line');

        expect(panelInfo.mode.isOrderBy).toBe(false);
        expect(buildLoadConfig(panelInfo).useOrderBy).toBe(true);

        const rawPanelInfo = {
            ...panelInfo,
            mode: {
                ...panelInfo.mode,
                isRaw: true,
                isOrderBy: false,
            },
        };

        expect(buildLoadConfig(rawPanelInfo).useOrderBy).toBe(false);
    });
});
