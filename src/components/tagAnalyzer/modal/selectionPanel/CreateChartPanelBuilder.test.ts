import {
    buildCreateChartPanel,
    buildCreateChartSeed,
    buildDefaultRange,
} from './CreateChartPanelBuilder';
import {
    createTagSelectionDraftListFixture,
    createTagSelectionSourceColumnsFixture,
} from '../../TestData/TagSelectionTestData';

describe('CreateChartPanelBuilder', () => {
    it('keeps a normal min/max range unchanged', () => {
        expect(buildDefaultRange(100, 200)).toEqual({ min: 100, max: 200 });
    });

    it('pads a zero-width range to keep the default visible', () => {
        expect(buildDefaultRange(100, 100)).toEqual({ min: 100, max: 110 });
    });

    it('builds the create-chart seed from explicit inputs', () => {
        const sSeed = buildCreateChartSeed(
            'Line',
            createTagSelectionDraftListFixture(),
            100,
            200,
        );

        expect(sSeed).toEqual({
            chartType: 'Line',
            tagSet: [
                expect.objectContaining({
                    key: 'tag-1',
                    sourceTagName: 'temp_sensor',
                    alias: '',
                    calculationMode: 'avg',
                    color: undefined,
                    useSecondaryAxis: false,
                    useRollupTable: false,
                    annotations: [],
                    sourceColumns: createTagSelectionSourceColumnsFixture(),
                }),
            ],
            defaultRange: { min: 100, max: 200 },
        });
        expect(sSeed.tagSet[0]).not.toHaveProperty('colName');
        expect(sSeed.tagSet[0]).not.toHaveProperty('use_y2');
        expect(sSeed.tagSet[0]).not.toHaveProperty('min');
        expect(sSeed.tagSet[0]).not.toHaveProperty('max');
    });

    it('builds the legacy-compatible append panel shape for new charts', () => {
        const sPanel = buildCreateChartPanel(
            'Zone',
            createTagSelectionDraftListFixture(),
            100,
            200,
        );

        expect(sPanel).toEqual(
            expect.objectContaining({
                chart_title: 'New chart',
                chart_type: 'Zone',
                interval_type: '',
                interval_value: 1,
                count: -1,
                raw_keeper: false,
                use_sampling: true,
                sampling_value: 0.01,
                tag_set: [
                    expect.objectContaining({
                        tagName: 'temp_sensor',
                        colName: expect.objectContaining({
                            name: 'name_col',
                            time: 'time_col',
                            value: 'value_col',
                        }),
                    }),
                ],
                range_bgn: 100,
                range_end: 200,
                show_point: 'N',
                fill: 0.15,
                stroke: 1,
            }),
        );
        expect(sPanel).not.toHaveProperty('meta');
        expect(sPanel).not.toHaveProperty('data');
    });
});
