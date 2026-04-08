import {
    createPanelEditorConfig,
    hasUnappliedEditorChanges,
    mergePanelEditorConfig,
    resolveEditorTimeBounds,
    replaceEditedPanelInBoardList,
} from './PanelEditorUtil';
import { createTagAnalyzerPanelInfoFixture } from '../TestData/PanelTestData';

jest.mock('@/utils/bgnEndTimeRange', () => ({
    subtractTime: jest.fn(),
}));

jest.mock('../TagAnalyzerUtilCaller', () => ({
    callTagAnalyzerBgnEndTimeRange: jest.fn(),
}));

jest.mock('../utils/TagAnalyzerDateUtils', () => ({
    convertTimeToFullDate: jest.fn(),
}));

const { subtractTime } = jest.requireMock('@/utils/bgnEndTimeRange') as {
    subtractTime: jest.Mock;
};

const { callTagAnalyzerBgnEndTimeRange } = jest.requireMock('../TagAnalyzerUtilCaller') as {
    callTagAnalyzerBgnEndTimeRange: jest.Mock;
};

const { convertTimeToFullDate } = jest.requireMock('../utils/TagAnalyzerDateUtils') as {
    convertTimeToFullDate: jest.Mock;
};

describe('PanelEditorUtil', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createPanelEditorConfig', () => {
        it('maps the nested panel info into editor sections', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture();

            expect(createPanelEditorConfig(panelInfo)).toEqual({
                general: {
                    chart_title: 'Panel One',
                    use_zoom: 'N',
                    use_time_keeper: 'N',
                    time_keeper: panelInfo.time.time_keeper,
                },
                data: {
                    index_key: 'panel-1',
                    tag_set: panelInfo.data.tag_set,
                },
                axes: panelInfo.axes,
                display: panelInfo.display,
                time: {
                    range_bgn: 'now-1h',
                    range_end: 'now',
                },
            });
        });
    });

    describe('mergePanelEditorConfig', () => {
        it('merges editor changes back into panel info and normalizes draft numbers', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture();

            const merged = mergePanelEditorConfig(panelInfo, {
                general: {
                    chart_title: 'Updated Title',
                    use_zoom: 'Y',
                    use_time_keeper: 'Y',
                    time_keeper: panelInfo.time.time_keeper,
                },
                data: {
                    index_key: 'panel-2',
                    tag_set: panelInfo.data.tag_set,
                },
                axes: {
                    ...panelInfo.axes,
                    pixels_per_tick_raw: '',
                    pixels_per_tick: 25,
                    sampling_value: '',
                    custom_min: '',
                    custom_max: 55,
                    custom_drilldown_min: '',
                    custom_drilldown_max: 75,
                    ucl_value: '',
                    lcl_value: 95,
                    custom_min2: '',
                    custom_max2: 115,
                    custom_drilldown_min2: '',
                    custom_drilldown_max2: 135,
                    ucl2_value: '',
                    lcl2_value: 155,
                },
                display: {
                    ...panelInfo.display,
                    point_radius: '',
                    fill: 8,
                    stroke: '',
                },
                time: {
                    range_bgn: 1000,
                    range_end: 2000,
                },
            });

            expect(merged.meta).toEqual({
                index_key: 'panel-2',
                chart_title: 'Updated Title',
            });
            expect(merged.time).toMatchObject({
                range_bgn: 1000,
                range_end: 2000,
                use_time_keeper: 'Y',
            });
            expect(merged.axes).toMatchObject({
                pixels_per_tick_raw: 0,
                pixels_per_tick: 25,
                sampling_value: 0,
                custom_min: 0,
                custom_max: 55,
                custom_drilldown_min: 0,
                custom_drilldown_max: 75,
                ucl_value: 0,
                lcl_value: 95,
                custom_min2: 0,
                custom_max2: 115,
                custom_drilldown_min2: 0,
                custom_drilldown_max2: 135,
                ucl2_value: 0,
                lcl2_value: 155,
            });
            expect(merged.display).toMatchObject({
                use_zoom: 'Y',
                point_radius: 0,
                fill: 8,
                stroke: 0,
            });
        });
    });

    describe('hasUnappliedEditorChanges', () => {
        it('detects whether the draft differs from the applied panel', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture();
            const changedPanel = {
                ...panelInfo,
                meta: {
                    ...panelInfo.meta,
                    chart_title: 'Changed',
                },
            };

            expect(hasUnappliedEditorChanges(panelInfo, panelInfo)).toBe(false);
            expect(hasUnappliedEditorChanges(panelInfo, changedPanel)).toBe(true);
        });
    });

    describe('resolveEditorTimeBounds', () => {
        const baseArgs = {
            tag_set: createTagAnalyzerPanelInfoFixture().data.tag_set,
            navigatorRange: {
                startTime: 1000,
                endTime: 2000,
            },
        };

        it('resolves last-based ranges through the fetched end bound', async () => {
            callTagAnalyzerBgnEndTimeRange.mockResolvedValue({ end_max: 10_000 });
            subtractTime.mockImplementation((aEndMax: number, aRange: string) => {
                return aRange === 'last-1h' ? aEndMax - 1000 : aEndMax - 500;
            });

            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    range_bgn: 'last-1h',
                    range_end: 'last-30m',
                }),
            ).resolves.toEqual({
                bgn_min: 9_000,
                bgn_max: 9_000,
                end_min: 9_500,
                end_max: 9_500,
            });

            expect(callTagAnalyzerBgnEndTimeRange).toHaveBeenCalled();
            expect(subtractTime).toHaveBeenCalledWith(10_000, 'last-1h');
            expect(subtractTime).toHaveBeenCalledWith(10_000, 'last-30m');
        });

        it('resolves now-based ranges through convertTimeToFullDate', async () => {
            convertTimeToFullDate.mockReturnValueOnce(2_000).mockReturnValueOnce(3_000);

            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    range_bgn: 'now-1h',
                    range_end: 'now',
                }),
            ).resolves.toEqual({
                bgn_min: 2_000,
                bgn_max: 2_000,
                end_min: 3_000,
                end_max: 3_000,
            });
        });

        it('resolves mixed-case now-based ranges through convertTimeToFullDate', async () => {
            convertTimeToFullDate.mockReturnValueOnce(4_000).mockReturnValueOnce(5_000);

            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    range_bgn: 'Now-1h',
                    range_end: 'Now',
                }),
            ).resolves.toEqual({
                bgn_min: 4_000,
                bgn_max: 4_000,
                end_min: 5_000,
                end_max: 5_000,
            });
        });

        it('uses literal numeric ranges directly', async () => {
            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    range_bgn: 10,
                    range_end: 20,
                }),
            ).resolves.toEqual({
                bgn_min: 10,
                bgn_max: 10,
                end_min: 20,
                end_max: 20,
            });
        });

        it('falls back to the navigator range when either side is empty', async () => {
            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    range_bgn: '',
                    range_end: '',
                }),
            ).resolves.toEqual({
                bgn_min: 1000,
                bgn_max: 1000,
                end_min: 2000,
                end_max: 2000,
            });
        });
    });

    describe('replaceEditedPanelInBoardList', () => {
        it('replaces only the matching panel in the matching board', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture();
            const updatedPanel = {
                ...panelInfo,
                meta: {
                    ...panelInfo.meta,
                    chart_title: 'Updated Panel',
                },
            };
            const boards = [
                {
                    id: 'board-1',
                    panels: [
                        {
                            index_key: 'panel-1',
                            chart_title: 'Old Panel',
                        },
                        {
                            index_key: 'panel-2',
                            chart_title: 'Untouched Panel',
                        },
                    ],
                },
                {
                    id: 'board-2',
                    panels: [
                        {
                            index_key: 'panel-1',
                            chart_title: 'Other Board Panel',
                        },
                    ],
                },
            ] as any;

            expect(replaceEditedPanelInBoardList(boards, 'board-1', 'panel-1', updatedPanel)).toEqual([
                {
                    id: 'board-1',
                    panels: [
                        expect.objectContaining({
                            index_key: 'panel-1',
                            chart_title: 'Updated Panel',
                            tag_set: updatedPanel.data.tag_set,
                            chart_type: updatedPanel.display.chart_type,
                        }),
                        {
                            index_key: 'panel-2',
                            chart_title: 'Untouched Panel',
                        },
                    ],
                },
                {
                    id: 'board-2',
                    panels: [
                        {
                            index_key: 'panel-1',
                            chart_title: 'Other Board Panel',
                        },
                    ],
                },
            ]);
        });
    });
});
