import { createTagAnalyzerPanelInfoFixture } from '../../../TestData/PanelTestData';
import { createPersistedPanelInfo } from '../save/TazPanelSaveMapper';
import { createPanelInfoFromPersistedV200 } from './TazPanelVersionParser';

describe('TazPanelVersionParser', () => {
    it('loads the supported persisted 2.0.0 panel into the runtime panel shape', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture({
            toolbar: {
                isRaw: true,
            },
        });

        expect(createPanelInfoFromPersistedV200(createPersistedPanelInfo(sPanelInfo))).toEqual({
            ...sPanelInfo,
            time: {
                ...sPanelInfo.time,
                range_bgn: 0,
                range_end: 0,
                use_time_keeper: false,
                time_keeper: undefined,
                default_range: undefined,
            },
        });
    });

    it('normalizes unsupported persisted chart types before creating runtime display state', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
        const sPersistedPanelInfo = createPersistedPanelInfo(sPanelInfo);
        const sPersistedPanelInfoWithBadChartType = {
            ...sPersistedPanelInfo,
            display: {
                ...sPersistedPanelInfo.display,
                chartType: 'Unsupported',
            },
        } as unknown as ReturnType<typeof createPersistedPanelInfo>;

        expect(
            createPanelInfoFromPersistedV200(sPersistedPanelInfoWithBadChartType).display
                .chart_type,
        ).toBe('Line');
    });
});
