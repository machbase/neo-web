import { createTagAnalyzerSeriesConfigFixture } from '../../TestData/PanelTestData';
import {
    getSeriesEditorName,
    getSeriesName,
    getSeriesShortName,
} from './PanelSeriesLabelFormatter';

describe('PanelSeriesLabelFormatter', () => {
    const sSeriesConfig = {
        ...createTagAnalyzerSeriesConfigFixture({
            calculationMode: 'AVG',
        }),
    };

    describe('getSeriesShortName', () => {
        it('prefers the alias when one exists', () => {
            expect(getSeriesShortName({ ...sSeriesConfig, alias: 'Temperature' })).toBe(
                'Temperature',
            );
        });

        it('falls back to the normalized source tag name', () => {
            expect(getSeriesShortName(sSeriesConfig)).toBe('temp_sensor');
        });
    });

    describe('getSeriesEditorName', () => {
        it('keeps the original calculation-mode text for editor labels', () => {
            expect(getSeriesEditorName(sSeriesConfig)).toBe('temp_sensor(AVG)');
        });
    });

    describe('getSeriesName', () => {
        it('prefers the alias when one exists', () => {
            expect(getSeriesName({ ...sSeriesConfig, alias: 'Temperature' })).toBe('Temperature');
        });

        it('builds a lowercase calculation-based label when there is no alias', () => {
            expect(getSeriesName(sSeriesConfig)).toBe('temp_sensor(avg)');
        });

        it('uses the raw label when requested', () => {
            expect(getSeriesName(sSeriesConfig, true)).toBe('temp_sensor(raw)');
        });
    });
});
