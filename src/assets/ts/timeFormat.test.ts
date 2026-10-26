import { TIME_FORMAT_LIST } from './timeFormat';

// F-175: 'HH:MI:SS' was sent as Go layout '03:04:05' — the 12-hour clock without AM/PM, so 18:30:07 read 06:30:07.
describe('TIME_FORMAT_LIST', () => {
    it('HH:MI:SS is the 24-hour Go layout', () => {
        expect(TIME_FORMAT_LIST.find((aItem) => aItem.label === 'HH:MI:SS')?.value).toBe('15:04:05');
    });
    it('every HH label uses the 24-hour hour (15)', () => {
        TIME_FORMAT_LIST.filter((aItem) => String(aItem.label).includes('HH')).forEach((aItem) => {
            expect(String(aItem.value)).toContain('15');
            expect(String(aItem.value)).not.toMatch(/(^|[^0-9])03:/);
        });
    });
});

// The data viewer opens the same modal, so its own list and formatter have to know the value the modal returns.
describe('data viewer HH:MI:SS', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TIME_FORMATS, formatDataViewerTime, getTimeFormatLabel } = require('@/components/dataViewer/dataViewerModel');
    it('uses the value the shared modal hands back', () => {
        expect(TIME_FORMATS.find((aItem: any) => aItem.label === 'HH:MI:SS')?.value).toBe(TIME_FORMAT_LIST.find((aItem) => aItem.label === 'HH:MI:SS')?.value);
        expect(getTimeFormatLabel('15:04:05')).toBe('HH:MI:SS');
    });
    it('prints the time alone on the 24-hour clock', () => {
        expect(formatDataViewerTime(Date.UTC(2026, 9, 26, 18, 30, 7), '15:04:05', 'UTC')).toBe('18:30:07');
    });
});
