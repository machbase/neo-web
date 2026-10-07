import { DashboardQueryParser } from './DashboardQueryParser';
import { DefaultTagTableOption } from './eChartHelper';
import { renumberBlockIndicesAfterDelete, renumberXAxisAfterDelete } from './helpers/Dashboard/BlockHelper';

/**
 * An Adv scatter plots one of its own series along the x-axis and names it by index into blockList.
 * Nothing renumbered that index when the blocks changed, so deleting the block it named left it
 * pointing past the end of the list and the query builder dereferenced undefined.
 */
const tagBlock = (aId: string, aTag: string) => ({
    ...JSON.parse(JSON.stringify(DefaultTagTableOption)),
    id: aId,
    userName: 'SYS',
    table: 'SYS.DEMO_TAG',
    type: 'tag',
    tag: aTag,
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
    aggregator: 'avg',
    timeBaseTime: true,
    timeType: 6,
    tableInfo: [
        ['NAME', 5, 0, 0, 0],
        ['TIME', 6, 0, 0, 0x01000000],
        ['VALUE', 20, 0, 0, 0],
    ],
});

const parse = (aBlocks: any[], aXAxis: any) =>
    DashboardQueryParser('advScatter', 'TIME_VALUE' as any, aBlocks, [], [], aXAxis, {
        interval: { IntervalType: '', IntervalValue: '' },
        start: 1,
        end: 2,
    } as any);

describe('an Adv scatter survives an x-axis index that no longer resolves', () => {
    test('a valid index still drives the x-axis', () => {
        const [sQueries]: any = parse([tagBlock('a', 't1'), tagBlock('b', 't2')], [{ useBlockList: [1] }]);
        // Every series query embeds the x-axis series' SQL, so the chosen block's tag shows up in all of them.
        expect(sQueries[0].query).toContain("'t2'");
    });

    test('an index left over from a deleted block falls back to the first series', () => {
        expect(() => parse([tagBlock('a', 't1')], [{ useBlockList: [1] }])).not.toThrow();
        const [sQueries]: any = parse([tagBlock('a', 't1')], [{ useBlockList: [1] }]);
        expect(sQueries[0].query).toContain("'t1'");
    });

    test('a panel with no useBlockList at all does not throw', () => {
        expect(() => parse([tagBlock('a', 't1')], [{}])).not.toThrow();
    });

    test('a panel with no xAxisOptions at all does not throw', () => {
        expect(() => parse([tagBlock('a', 't1')], [])).not.toThrow();
    });

    test('no series to fall back to is not a crash either', () => {
        expect(() => parse([], [{ useBlockList: [0] }])).not.toThrow();
    });
});

describe('deleting a block renumbers the series indices the axes hold', () => {
    test('indices after the deleted one shift down', () => {
        expect(renumberBlockIndicesAfterDelete([0, 1, 2, 3], 1)).toEqual([0, 1, 2]);
    });

    test('the deleted index drops out', () => {
        expect(renumberBlockIndicesAfterDelete([1], 1)).toEqual([]);
    });

    test('indices before the deleted one are untouched', () => {
        expect(renumberBlockIndicesAfterDelete([0, 3], 2)).toEqual([0, 2]);
    });

    test('a missing list is treated as empty', () => {
        expect(renumberBlockIndicesAfterDelete(undefined, 0)).toEqual([]);
    });

    test('the x-axis shifts down with the rest', () => {
        expect(renumberXAxisAfterDelete([{ useBlockList: [2] }], 1)[0].useBlockList).toEqual([1]);
    });

    // The x-axis has to name some series, so losing its own block promotes the first one rather than
    // leaving the panel with an empty list the query builder would have to guess at.
    test('deleting the x-axis block itself falls back to the first series', () => {
        expect(renumberXAxisAfterDelete([{ useBlockList: [1] }], 1)[0].useBlockList).toEqual([0]);
    });

    test('the rest of the x-axis options are preserved', () => {
        const sResult = renumberXAxisAfterDelete([{ useBlockList: [2], type: 'value', scale: true }], 0);
        expect(sResult[0]).toMatchObject({ type: 'value', scale: true, useBlockList: [1] });
    });
});
