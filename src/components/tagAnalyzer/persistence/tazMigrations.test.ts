import { createNewPanelInfo } from '../panel/panelModel';
import { encodeTazBoard, TazVersion } from './tazFormat';
import { parseLoadedTaz } from './tazMigrations';

function encodePanel(panel = createNewPanelInfo([], 'Panel', 'Line')) {
    return encodeTazBoard({
        id: 'board',
        type: 'taz',
        name: 'board.taz',
        path: '/',
        code: '',
        savedCode: false,
        boardTimeRange: { start: 'now-1h', end: 'now' },
        boardNumericRange: { start: '', end: '' },
        panels: [panel],
    });
}

function createV204Board(sampleCount: number) {
    const yAxis = {
        zero_base: false,
        show_tickline: true,
        value_range: { min: undefined, max: undefined },
        raw_data_value_range: { min: undefined, max: undefined },
        upper_control_limit: { enabled: false, value: 0 },
        lower_control_limit: { enabled: false, value: 0 },
    };

    return {
        version: TazVersion.V204,
        panels: [{
            general: {
                chart_title: 'Panel',
                use_zoom: true,
                use_last_viewed_range: false,
                is_raw: true,
                use_normalize: false,
            },
            data: {
                index_key: 'panel',
                tag_set: [],
                count: undefined,
                interval_type: undefined,
            },
            time: { range_config: { start: '', end: '' } },
            axes: {
                x_axis: {
                    show_tickline: true,
                    raw_data_pixels_per_tick: undefined,
                    calculated_data_pixels_per_tick: 3,
                },
                main_chart_sampling: {
                    enabled: true,
                    sample_count: sampleCount,
                },
                left_y_axis: yAxis,
                right_y_axis_enabled: false,
                right_y_axis: yAxis,
            },
            display: {
                show_legend: true,
                chart_type: 'Line',
                show_point: true,
                point_radius: 0,
                fill: 0,
                stroke: 1,
            },
        }],
    };
}

describe('TagAnalyzer persistence version dispatch', () => {
    it('round-trips a current panel through the current parser', () => {
        const panel = createNewPanelInfo([], 'Panel', 'Line');
        panel.time.useLastViewedRange = true;
        panel.time.lastViewedRange = {
            mainRange: { start: 10, end: 20 },
            navigatorRange: { start: 0, end: 30 },
        };
        panel.highlights = [{
            text: 'highlight',
            timeRange: { start: 10, end: 20 },
            fillColor: '#111111',
            textColor: '#222222',
        }];
        panel.annotations = [{
            text: 'annotation',
            timeRange: { start: 15, end: 15 },
            fillColor: '#333333',
            textColor: '#444444',
            seriesKey: 'series',
            clip: true,
        }];
        const encoded = encodePanel(panel);

        expect(encoded.panels[0].timeRange.lastViewedRange).toEqual({
            panelRange: { startTime: 10, endTime: 20 },
            navigatorRange: { startTime: 0, endTime: 30 },
        });
        expect(encoded.panels[0].highlights[0].timeRange).toEqual({
            startTime: 10,
            endTime: 20,
        });
        expect(encoded.panels[0].annotations[0].timeRange).toEqual({
            startTime: 15,
            endTime: 15,
        });

        const decodedPanel = parseLoadedTaz(encoded).panels[0];
        expect(decodedPanel.time.lastViewedRange).toEqual(
            panel.time.lastViewedRange,
        );
        expect(decodedPanel.highlights[0].timeRange).toEqual(
            panel.highlights[0].timeRange,
        );
        expect(decodedPanel.annotations[0].timeRange).toEqual(
            panel.annotations[0].timeRange,
        );
    });

    it.each([0, -0.01])(
        'rejects enabled v2.1 sampling with count %s',
        (sampleCount) => {
            const encoded = encodePanel();
            encoded.panels[0].display.mainChartSampling = {
                enabled: true,
                sampleCount,
            };

            expect(() => parseLoadedTaz(encoded)).toThrow(
                'display.mainChartSampling.sampleCount',
            );
        },
    );

    it('disables invalid sampling while migrating v2.0.4', () => {
        const panel = parseLoadedTaz(createV204Board(0)).panels[0];

        expect(panel.display.mainChartSampling).toEqual({
            enabled: false,
            sampleCount: 0,
        });
    });

    it.each([
        [TazVersion.V210, 'Invalid TagAnalyzer .taz v2.1 panel structure.'],
        [TazVersion.V205, 'Invalid TagAnalyzer .taz 2.0.5 panel structure.'],
        [TazVersion.V204, 'Invalid TagAnalyzer .taz 2.0.4 panel structure.'],
        [TazVersion.V203, 'Invalid TagAnalyzer .taz 2.0.3 panel structure.'],
        [TazVersion.V200, 'Invalid TagAnalyzer .taz 2.0.0 panel structure.'],
    ])('rejects a malformed %s panel', (version, message) => {
        expect(() => parseLoadedTaz({ version, panels: [{}] })).toThrow(message);
    });

    it('retains the legacy repair path that drops an unrepairable panel', () => {
        expect(parseLoadedTaz({ panels: [null] }).panels).toEqual([]);
    });
});
