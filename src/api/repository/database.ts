import { SQL_BASE_LIMIT } from '@/utils/sqlFormatter';
import request from '../core';

const parseTqlResponse = (data: any) => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }
    return data;
};

const getReasonText = (data: any) => {
    const parsedData = parseTqlResponse(data?.data ?? data);
    const reason = parsedData?.reason ?? data?.reason;
    if (typeof reason === 'string') return reason;
    if (reason === null || reason === undefined) return data?.toString?.() ?? '';
    try {
        return JSON.stringify(reason);
    } catch {
        return String(reason);
    }
};

/**
 * A database name is safe to interpolate into `use('...')` only if it is an identifier.
 *
 * (Named `build…` rather than `use…` so the react-hooks lint rule does not read it as a hook.)
 *
 * The engine has no placeholder for this position, so anything else is dropped rather than
 * quoted — a name that could close the literal must never reach the statement.
 */
const buildUseDirective = (aDatabase?: string) => {
    const sName = String(aDatabase ?? '').trim();
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(sName) ? `use('${sName}')` : '';
};

/**
 * `use` runs the statement against a named database instead of the session's own.
 *
 * It exists for catalogue views that are scoped to the session's database and carry no column
 * saying so, which a statement cannot filter. `V$RETENTION_JOB` was the view that forced it in,
 * and is no longer one: measured on engine dev-4158 it now carries `DATABASE_ID`/`DATABASE_NAME`
 * and answers with every database's jobs whatever the session — the same two rows under
 * `use('FACTORY_A')`, under `use('MACHBASEDB')` and with no directive at all. Its caller filters
 * on `DATABASE_ID` instead (see `buildRetentionQuery`), so nothing passes a database today. The
 * directive is kept because the shape of the next such view is not known in advance; before
 * reaching for it, measure that `use()` actually narrows the view in question.
 *
 * Servers older than v8.7 do not know the directive and answer `unknown env: use`, so a caller
 * passes a database only when `hasLogicalDatabases()` says the server has them.
 */
const wrapSqlForTql = (sql: string, database?: string) => {
    const sUse = buildUseDirective(database);
    return `SQL(${sUse ? sUse + ', ' : ''}\`${sql.replace(/`/g, '\\`')}\`)\nJSON()`;
};

export const fetchQuery = async (query: string) => {
    const sData: any = await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(query),
    });
    return { svrState: sData?.success ?? false, svrData: sData?.data, svrReason: sData?.data?.reason ?? sData?.reason ?? sData?.toString() };
};
export const fetchTqlWithoutConsole = async (aSql: string, aDatabase?: string) => {
    const query = wrapSqlForTql(aSql, aDatabase);
    const consoleId = localStorage.getItem('consoleId');

    const requestConfig: any = {
        method: 'POST',
        url: `/api/tql`,
        data: query,
    };

    requestConfig.headers = {
        'X-Console-Id': consoleId + ', console-log-level=NONE' || '',
        'X-Console-Log-Level': 'NONE',
    };

    const sData: any = await request(requestConfig);
    const parsedData = parseTqlResponse(sData?.data);

    return { svrState: parsedData?.success ?? false, svrData: parsedData?.data, svrReason: getReasonText(sData) };
};

export const fetchTqlQuery = async (aSql: string, aPage: number, aTake: number | undefined = SQL_BASE_LIMIT) => {
    const query = 'SQL(' + '`' + aSql + '`)\n' + 'DROP(' + aPage * SQL_BASE_LIMIT + `)\nTAKE(${aTake})\nJSON()`;
    const sData: any = await request({
        method: 'POST',
        url: `/api/tql/dsh`,
        data: query,
    });

    return { svrState: sData?.data?.success ?? false, svrData: sData?.data?.data, svrReason: sData?.data?.reason ?? sData?.reason ?? sData?.toString() };
};
