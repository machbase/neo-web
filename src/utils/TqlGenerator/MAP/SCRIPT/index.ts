import { E_TQL_MAP } from '..';

export enum E_TQL_SCRIPT_LANGUAGE {
    JS = 'js',
}
enum E_TQL_SCRIPT_JS_UTILS {
    REQUEST_DO = 'REQUEST_DO',
    REQUEST = 'REQUEST',
    DO = 'DO',
    YIELD = 'YIELD',
}
/////////////////////// TEMPLATE ///////////////////////
const template = {
    [E_TQL_SCRIPT_JS_UTILS.YIELD]: `$.yield(\${${E_TQL_SCRIPT_JS_UTILS.YIELD}});`,
    [E_TQL_SCRIPT_JS_UTILS.REQUEST_DO]: `$.request(\${${E_TQL_SCRIPT_JS_UTILS.REQUEST}}).do(\${${E_TQL_SCRIPT_JS_UTILS.DO}});`,
    [E_TQL_SCRIPT_JS_UTILS.REQUEST]: `"\${URL}", {\nmethod: "\${METHOD}",\nheaders: {"Authorization": "Bearer \${TOKEN}" },\nbody: \${BODY}\n}`,
    [E_TQL_SCRIPT_JS_UTILS.DO]: `function (rsp) {\nif (rsp.error() !== undefined) return;\nrsp.\${METHOD}(\${CALLBACK})\n}`,
};
// "X-Console-Id": "\${XCONSOLEID}",
/////////////////////////////////////////////////////////
const RequestDo = (aReq: { method: 'POST'; url: string; body: string }, aDo: { method: string; callback: string }): string => {
    if (!aReq || !aReq.method || !aReq.url || !aReq.body || !aDo) return '';
    let reqOpt = template[E_TQL_SCRIPT_JS_UTILS.REQUEST];
    let doOpt = template[E_TQL_SCRIPT_JS_UTILS.DO];
    if (aReq.method) reqOpt = reqOpt.replace(`\${METHOD}`, aReq.method);
    if (aReq.url) reqOpt = reqOpt.replace(`\${URL}`, window.location.origin + aReq.url);
    // if (aReq.url) reqOpt = reqOpt.replace(`\${URL}`, 'http://192.168.1.250:6654' + aReq.url);
    if (aReq.body) reqOpt = reqOpt.replace(`\${BODY}`, aReq.body);
    reqOpt = reqOpt.replace(`\${TOKEN}`, localStorage.getItem('accessToken') || '');
    // reqOpt = reqOpt.replace(`\${XCONSOLEID}`, localStorage.getItem('consoleId') || '');
    if (aDo) doOpt = doOpt.replace('${METHOD}', aDo.method).replace('${CALLBACK}', aDo.callback);
    return template[E_TQL_SCRIPT_JS_UTILS.REQUEST_DO].replace(`\${${E_TQL_SCRIPT_JS_UTILS.REQUEST}}`, reqOpt).replace(`\${${E_TQL_SCRIPT_JS_UTILS.DO}}`, doOpt);
};
const Yield = (script: string): string => {
    return template[E_TQL_SCRIPT_JS_UTILS.YIELD].replace(`\${${E_TQL_SCRIPT_JS_UTILS.YIELD}}`, script);
};
const Var = (name: string, value: string): string => {
    return `var ${name} = ${value};`;
};

const SCRIPT = (type: keyof typeof E_TQL_SCRIPT_LANGUAGE, scripts: { main: string; init?: string }) => {
    const sScriptList = [scripts.main];
    if (scripts?.init) sScriptList.unshift(scripts.init);
    const sResultScript = `${E_TQL_MAP.SCRIPT}("${E_TQL_SCRIPT_LANGUAGE[type]}",\n${sScriptList.map((scr) => '{ ' + scr + ' }\n')})`;
    return '\n' + sResultScript;
};

SCRIPT.Var = Var;
SCRIPT.Yield = Yield;
SCRIPT.RequestDo = RequestDo;

export default SCRIPT;
