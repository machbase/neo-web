import {
    getPanelSeriesDisplayColor,
    TAG_ANALYZER_LINE_COLORS,
} from './PanelSeriesColorResolver';

describe('PanelSeriesColorResolver', () => {
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
