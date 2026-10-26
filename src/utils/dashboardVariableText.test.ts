import { literalReplacement, variableKeyRegExp } from './dashboardVariableText';
import { replaceVariablesInTql } from './TqlVariableReplacer';
import { replaceVariablesInTql as replacePublicVariablesInTql } from '../public-dashboard/utils/TqlVariableReplacer';
import { VariableParser } from './DashboardQueryParser';
import { VariableParser as PublicVariableParser } from '../public-dashboard/utils/DashboardQueryParser';
import SCRIPT from './TqlGenerator/MAP/SCRIPT';
import PUBLIC_SCRIPT from '../public-dashboard/utils/TqlGenerator/MAP/SCRIPT';
import { TqlChartParser } from './DashboardTqlChartParser';
import { TqlChartParser as PublicTqlChartParser } from '../public-dashboard/utils/DashboardTqlChartParser';

const time = { interval: { IntervalType: 'min', IntervalValue: 10 }, start: 1700000000000, end: 1700003600000 };
const variable = (key: string, value: string) => ({ id: key, label: key, key, type: 'SELECT', use: { id: 'u', type: 'CSV', value }, valueList: [{ id: 'u', type: 'CSV', value }] }) as any;

describe('variableKeyRegExp (#1558)', () => {
    test.each(['{{a(b}}', '{{a[b}}', '{{a+}}', '{{a.b}}', '{{a*b?}}', '{{a|b}}', '{{a^b$}}', '{{a\\b}}'])('%s compiles and matches only itself', (key) => {
        expect(() => variableKeyRegExp(key)).not.toThrow();
        expect(`x ${key} y`.replaceAll(variableKeyRegExp(key), 'V')).toBe('x V y');
    });

    test('a regex-looking name no longer matches other names', () => {
        expect('{{aaa}} {{axb}}'.replace(variableKeyRegExp('{{a+}}'), 'V')).toBe('{{aaa}} {{axb}}');
        expect('{{axb}}'.replace(variableKeyRegExp('{{a.b}}'), 'V')).toBe('{{axb}}');
    });
});

describe('literalReplacement (#1558)', () => {
    test.each(['a$&b', "a$'b", 'a$`b', 'a$1b', 'a$$b', 'plain'])('%s is inserted as typed', (value) => {
        expect('[X]'.replace('X', literalReplacement(value))).toBe(`[${value}]`);
    });
});

describe.each([
    ['editor', replaceVariablesInTql, VariableParser],
    ['public', replacePublicVariablesInTql, PublicVariableParser],
])('%s variable substitution (#1558)', (_, replace, parse) => {
    test('ordinary variables are replaced as before', () => {
        expect(replace("NAME = '{{tag}}' AND {{period}}", [variable('{{tag}}', 'sine-a')], time as any)).toBe("NAME = 'sine-a' AND 10m");
    });

    test('a name with ( or [ no longer throws and is replaced', () => {
        expect(() => parse([variable('{{a(b}}', 'x'), variable('{{a[b}}', 'y')], time as any)).not.toThrow();
        expect(replace('{{a(b}}-{{a[b}}', [variable('{{a(b}}', 'x'), variable('{{a[b}}', 'y')], time as any)).toBe('x-y');
    });

    test.each(['roll-$&', "a$'b", 'a$1b', 'a$$b'])('value %s is inserted as typed', (value) => {
        expect(replace("NAME = '{{tag}}'", [variable('{{tag}}', value)], time as any)).toBe(`NAME = '${value}'`);
    });
});

describe.each([
    ['editor', SCRIPT],
    ['public', PUBLIC_SCRIPT],
])('%s SCRIPT request body (#1558)', (_, script) => {
    test('a body with $& $\' $1 is kept as typed', () => {
        const body = JSON.stringify("SQL(\"SELECT '$&' , '$1', 'it$'s' FROM T\")");
        expect(script.RequestDoQuick(body)).toContain(body);
    });
});

describe.each([
    ['editor', TqlChartParser],
    ['public', PublicTqlChartParser],
])('%s TQL chart parameters (#1558)', (_, parse) => {
    const interval = { IntervalType: 'min', IntervalValue: 10 };
    const chart = (name: string) => ({ path: '/a.tql', params: [{ name, value: 'tag' }] });

    test('an ordinary variable fills its parameter', () => {
        expect(parse(chart('{{tag}}'), time, interval, [variable('{{tag}}', 'sine-a')])).toBe('/a.tql?tag=sine-a');
    });

    test('a value with $& and a name with ( are kept as typed', () => {
        expect(parse(chart('{{tag}}'), time, interval, [variable('{{tag}}', 'a$&b')])).toBe('/a.tql?tag=a$&b');
        expect(parse(chart('{{t(}}'), time, interval, [variable('{{t(}}', 'x')])).toBe('/a.tql?tag=x');
    });
});

// #1566 (F-39): a panel saved with an empty x-axis unit (old or hand-edited board).
describe.each([
    ['editor', replaceVariablesInTql, TqlChartParser],
    ['public', replacePublicVariablesInTql, PublicTqlChartParser],
])('%s {{period}} / $period with no unit', (_, replace, parseChart) => {
    test.each([
        [{ IntervalType: 'min', IntervalValue: 10 }, '10m'],
        [{ IntervalType: '', IntervalValue: 10 }, ''],
        [{ IntervalType: '', IntervalValue: '' }, ''],
    ])('%o gives %p', (interval, expected) => {
        expect(replace("'{{period}}'", [], { ...time, interval } as any)).toBe(`'${expected}'`);
        expect(parseChart({ path: '/a.tql', params: [{ name: '$period', value: 'p' }] }, time, interval as any, [])).toBe(`/a.tql?p=${expected}`);
    });
});
