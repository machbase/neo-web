import { createTagAnalyzerSeriesConfigFixture } from '../TestData/PanelTestData';
import {
    getPanelSeriesDisplayColor,
    getSeriesEditorName,
    getSeriesName,
    getSeriesShortName,
    TAG_ANALYZER_LINE_COLORS,
} from './PanelSeriesUtils';

describe('PanelSeriesUtils', () => {
    describe('series labels', () => {
        const sSeriesConfig = {
            ...createTagAnalyzerSeriesConfigFixture({
                calculationMode: 'AVG',
            }),
        };

        it('prefers the alias for short labels when one exists', () => {
            expect(getSeriesShortName({ ...sSeriesConfig, alias: 'Temperature' })).toBe(
                'Temperature',
            );
        });

        it('falls back to the normalized source tag name for short labels', () => {
            expect(getSeriesShortName(sSeriesConfig)).toBe('temp_sensor');
        });

        it('keeps the original calculation-mode text for editor labels', () => {
            expect(getSeriesEditorName(sSeriesConfig)).toBe('temp_sensor(AVG)');
        });

        it('prefers the alias for chart labels when one exists', () => {
            expect(getSeriesName({ ...sSeriesConfig, alias: 'Temperature' })).toBe(
                'Temperature',
            );
        });

        it('builds a lowercase calculation-based chart label when there is no alias', () => {
            expect(getSeriesName(sSeriesConfig)).toBe('temp_sensor(avg)');
        });

        it('uses the raw chart label when requested', () => {
            expect(getSeriesName(sSeriesConfig, true)).toBe('temp_sensor(raw)');
        });
    });

    describe('series colors', () => {
        it('prefers the stored series color', () => {
            const sColor = getPanelSeriesDisplayColor({ color: '#ff0000' }, 1);

            expect(sColor).toBe('#ff0000');
        });

        it('uses the palette color for the series index when no color is stored', () => {
            const sColor = getPanelSeriesDisplayColor({}, 1);

            expect(sColor).toBe(TAG_ANALYZER_LINE_COLORS[1]);
        });

        it('wraps palette colors when the series index exceeds the palette length', () => {
            const sColor = getPanelSeriesDisplayColor({}, TAG_ANALYZER_LINE_COLORS.length);

            expect(sColor).toBe(TAG_ANALYZER_LINE_COLORS[0]);
        });
    });
});
