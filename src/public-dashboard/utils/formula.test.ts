import { mathValueConverter } from './DashboardQueryParser';

test.each([
    ['괄호 포함 - 공백 X', 'value(0)* 10', 'value(0) * 10'],
    ['괄호 포함 - 공백 1', `value (0) * 10`, 'value(0)  * 10'],
    ['괄호 포함 - 공백 n', `value   (0) * 10`, 'value(0)  * 10'],
    ['괄호 포함 - 내부 공백 n', `value(  0  ) * 10`, 'value(0)  * 10'],
    ['VALUE-NUMBER - 공백 X', 'value0* 10', 'value(0) * 10'],
    ['VALUE-NUMBER - 공백 1', 'value 0* 10', 'value(0) * 10'],
    ['VALUE-NUMBER - 공백 n', 'value           0* 10', 'value(0) * 10'],
    ['VALUE-OPERATOR - 공백 X', 'value* 10', 'value(0) * 10'],
    ['VALUE-OPERATOR - 공백 1', 'value * 10', 'value(0) * 10'],
    ['VALUE-OPERATOR - 공백 n', 'value      * 10', 'value(0) * 10'],
    ['VALUE-NUMBER-OPERATOR - 공백 X', 'value0* 10', 'value(0) * 10'],
    ['VALUE-NUMBER-OPERATOR - 공백 1', 'value 0* 10', 'value(0) * 10'],
    ['VALUE-NUMBER-OPERATOR - 공백 n', 'value      0* 10', 'value(0) * 10'],
    ['MULTI-VALUE', 'value * value', 'value(0) * value(0) '],
])('FORMULA - %s', (_, aFormula, expected) => {
    expect(mathValueConverter('0', aFormula)).toEqual(expected);
});
