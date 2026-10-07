import { RefreshUnitSnapshots } from './CheckDataCompatibility';
import { findUnitById } from './Chart/AxisConstants';
import { unitFormatter } from './Chart/formatters';

// Saved dashboards carry the whole UnitItem, so a corrected UNITS entry only reaches them if the
// snapshot is re-read on load. These lock that in for the 'B/s' -> 'B' Data-group correction.
describe('RefreshUnitSnapshots', () => {
    test('rewrites a stale Data-group suffix saved before the correction', () => {
        const sSavedPanel = {
            type: 'Line',
            yAxisOptions: [{ unit: { id: 'bytes_SI', label: 'bytes (SI)', suffix: 'B/s', sourceScale: 1, outFormat: 'SI' }, label: { decimals: 1 } }],
        };

        const sResult = RefreshUnitSnapshots(sSavedPanel);

        expect(sResult.yAxisOptions[0].unit).toEqual(findUnitById('bytes_SI'));
        expect(sResult.yAxisOptions[0].unit.suffix).toBe('B');
    });

    test('leaves a Data rate unit alone — its suffix really is per-second', () => {
        const sSaved = { unit: { id: 'bytes_sec_SI', label: 'bytes/sec (SI)', suffix: 'B/s', sourceScale: 1, outFormat: 'SI' } };

        expect(RefreshUnitSnapshots(sSaved).unit.suffix).toBe('B/s');
    });

    test('reaches every place a unit is persisted, whatever the key', () => {
        const sSavedPanel = {
            xAxisOptions: [{ unit: { id: 'bits_IEC', label: 'bits (IEC)', suffix: 'b/s', sourceScale: 1, outFormat: 'IEC' } }],
            commonOptions: { tooltipUnit: { id: 'bytes_IEC', label: 'bytes (IEC)', suffix: 'B/s', sourceScale: 1, outFormat: 'IEC' } },
            chartOptions: { unit: { id: 'bits_SI', label: 'bits (SI)', suffix: 'b/s', sourceScale: 1, outFormat: 'SI' } },
        };

        const sResult = RefreshUnitSnapshots(sSavedPanel);

        expect(sResult.xAxisOptions[0].unit.suffix).toBe('bit');
        expect(sResult.commonOptions.tooltipUnit.suffix).toBe('B');
        expect(sResult.chartOptions.unit.suffix).toBe('bit');
    });

    test('keeps a snapshot whose id is no longer in UNITS', () => {
        const sSaved = { unit: { id: 'retired_unit', label: 'retired', suffix: 'X/s', sourceScale: 1, outFormat: 'SI' } };

        expect(RefreshUnitSnapshots(sSaved).unit.suffix).toBe('X/s');
    });

    test('does not disturb the rest of the panel', () => {
        const sSavedPanel = {
            type: 'Line',
            title: 'SYSMEM',
            xAxisOptions: [{ label: { name: 'value', key: 'value', title: '', unit: '', decimals: undefined, squared: 0 } }],
            blockList: [{ table: '_NEO_STATZ', values: [{ aggregator: 'value' }] }],
        };

        expect(RefreshUnitSnapshots(sSavedPanel)).toEqual(sSavedPanel);
    });
});

// The rendered label is `baseUnits[scale] + suffix`, so a unit's spelling is only half in UNITS.
// These pin the whole composition for the entries the SI/IEC correction touched.
describe('scale prefix + suffix composition', () => {
    const format = (aUnitId: string, aValue: number) => {
        const sUnit = findUnitById(aUnitId)!;
        // eslint-disable-next-line no-eval
        return eval('(' + unitFormatter(sUnit, 1).formatter + ')')(aValue);
    };

    test('SI kilo is lowercase k — uppercase K is kelvin, and it is what IEC kibi uses', () => {
        expect(format('bytes_SI', 1500)).toBe('1.5 kB');
        expect(format('bytes_IEC', 1500)).toBe('1.5 KiB');
    });

    test('SI prefixes at mega and above stay uppercase', () => {
        expect(format('bytes_SI', 6.5e9)).toBe('6.5 GB');
    });

    test('bit is spelled out, so it cannot be misread as byte', () => {
        expect(format('bits_SI', 1500)).toBe('1.5 kbit');
        expect(format('bits_IEC', 1500)).toBe('1.5 Kibit');
        expect(format('bits_sec_IEC', 1500)).toBe('1.5 Kibit/s');
    });

    test('Data carries no per-second suffix; Data rate does', () => {
        expect(format('bytes_SI', 6.5e9)).toBe('6.5 GB');
        expect(format('bytes_sec_SI', 6.5e9)).toBe('6.5 GB/s');
    });
});
