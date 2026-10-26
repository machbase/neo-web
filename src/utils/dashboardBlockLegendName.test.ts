import { DashboardQueryParser, getBlockLegendName } from './DashboardQueryParser';
import { DefaultTagTableOption } from './eChartHelper';

// #1566 (F-116): the Transform Series list names each block as the legend does.
const block = (aId: string, aTag: string, aOverrides: Record<string, any> = {}) => ({
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
    alias: '',
    tableInfo: [
        ['NAME', 5, 0, 0, 0],
        ['TIME', 6, 0, 0, 0x01000000],
        ['VALUE', 20, 0, 0, 0],
    ],
    ...aOverrides,
});

const legendNames = (aBlocks: any[]) => {
    const [, sAliasList]: any = DashboardQueryParser('line', 'TIME_VALUE' as any, aBlocks, [], [], [], { interval: { IntervalType: 'min', IntervalValue: 1 }, start: 1, end: 2 } as any);
    return sAliasList.map((aAlias: any) => aAlias.name);
};

test('two blocks on one table and column are told apart by their tags, as in the legend', () => {
    const sBlocks = [block('a', 'tag-a'), block('b', 'tag-b')];
    expect(sBlocks.map(getBlockLegendName)).toEqual(['tag-a(avg)', 'tag-b(avg)']);
    expect(sBlocks.map(getBlockLegendName)).toEqual(legendNames(sBlocks));
});

test('an alias, an expanded block and a raw value are named as the legend names them', () => {
    const sBlocks = [
        block('a', 'tag-a', { alias: 'Front' }),
        block('b', 'tag-b', { aggregator: 'value' }),
        block('c', '', { useCustom: true, values: [{ id: 'v', value: 'VALUE', aggregator: 'max', alias: '', jsonKey: '' }], filter: [{ id: 'f', column: 'NAME', operator: 'in', value: 'tag-c', useFilter: true, useTyping: false, typingValue: '' }] }),
    ];
    expect(sBlocks.map(getBlockLegendName)).toEqual(['Front', 'tag-b', 'VALUE(max)']);
    expect(sBlocks.map(getBlockLegendName)).toEqual(legendNames(sBlocks));
});
