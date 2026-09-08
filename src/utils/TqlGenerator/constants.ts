import TQL from '.';

export const DSH_CACHE_TIME = '2s';

/**
 * Dashboard charts plot the base column as milliseconds (the Full query helper states it as
 * "TIME(milli sec)"). Selecting mode already emits a number — `TO_TIMESTAMP(col) / 1000000` — but a
 * typed query hands its columns over as they are, and a DATETIME one leaves through the JSON sink at
 * the server default of nanoseconds. Asking the sink for ms converts DATETIME columns only, so a
 * typed query that already produces a number is unaffected.
 */
export const DSH_JSON_MS_TIMEFORMAT = "timeformat('ms')";

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
    TRANSFORM: DSH_CHART_SCRIPT_MAIN_STR.replace(E_REPLACE.ITEM, TQL.MAP.SCRIPT.Yield('...xAxis[k], $.values[1]')),
};
export const DSH_CHART_NAME_VALUE_SCRIPT_MODULE = {
    INIT: TQL.MAP.SCRIPT.Var('xAxis', 'undefined'),
    MAIN: TQL.MAP.SCRIPT.Yield('...$.values, xAxis[0][0].value'),
};
