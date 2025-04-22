import TQL from '.';

export const DSH_CACHE_TIME = '2s';

enum E_REPLACE {
    ITEM = '{{REPLACE_ITEM}}',
}

const DSH_CHART_SCRIPT_INIT_STR = `\nvar xAxis = undefined;\nvar incIdx = 0;\nvar eofFlag = false;\nvar targetTime = undefined;\n`;
const DSH_CHART_SCRIPT_MAIN_STR = `\nfor (var k = incIdx; k < xAxis.length; k++) {\nif (eofFlag) break;\ntargetTime = JSON.parse($.values[0]);\nif (xAxis[k][0] === targetTime) {\nincIdx = k + 1;\n${E_REPLACE.ITEM}\nbreak;\n}\nif (xAxis[k][0] > targetTime) {\nincIdx = k - 1;\nbreak;\n}\nif (xAxis.length - 1 === k) eofFlag = true;\n};\n`;
export const DSH_CHART_TIME_VALUE_SCRIPT_MODULE = {
    INIT: DSH_CHART_SCRIPT_INIT_STR,
    MAIN: DSH_CHART_SCRIPT_MAIN_STR.replace(E_REPLACE.ITEM, TQL.MAP.SCRIPT.Yield('...$.values, xAxis[k][1]')),
};
export const DSH_CHART_VALUE_VALUE_SCRIPT_MODULE = {
    INIT: DSH_CHART_SCRIPT_INIT_STR,
    MAIN: DSH_CHART_SCRIPT_MAIN_STR.replace(E_REPLACE.ITEM, TQL.MAP.SCRIPT.Yield('xAxis[k][1], $.values[1]')),
};
export const DSH_CHART_NAME_VALUE_SCRIPT_MODULE = {
    INIT: TQL.MAP.SCRIPT.Var('xAxis', 'undefined'),
    MAIN: `${TQL.MAP.SCRIPT.Var(
        'tmpData',
        '$.values[0]'
    )}\nif (!Object.hasOwn(tmpData, "idx")) tmpData.idx = 2\nelse tmpData.idx = tmpData.idx + 1;\ntmpData['value' + tmpData.idx] = xAxis[0][0].value;`,
    YIELD: (aNum: number) => {
        const tmpStr = Array.from({ length: aNum }, (_, idx) => `tmpData.value${idx + 1}`);
        return tmpStr;
    },
};
