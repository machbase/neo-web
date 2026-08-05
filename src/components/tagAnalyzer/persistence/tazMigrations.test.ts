import { createNewPanelInfo } from '../panel/panelModel';
import { encodeTazBoard, TazVersion } from './tazFormat';
import { parseLoadedTaz } from './tazMigrations';

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
        const encoded = encodeTazBoard({
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
