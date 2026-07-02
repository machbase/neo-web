// bridge repository — migrated to the machbase-neo UI-API (JSON-RPC) (#1334 Wave A).
//
// Migrated (RPC exists): getBridge→bridge.list, genBridge→bridge.add, delBridge→bridge.delete,
//   commandBridge→bridge.test / bridge.exec / (bridge.query + bridge.result.fetch/close cursor),
//   getSubr→schedule.list (filtered to type=subscriber), genSubr→schedule.subscriber.add,
//   delSubr→schedule.delete, commandSubr→schedule.start / schedule.stop.
// Kept on REST: getSubrItem (no single-item read RPC `schedule.get` exists).
// The external signatures and return envelopes ({ data, success, reason, elapse }) are kept as-is so
// the bridge components render unchanged; only the internals are swapped to RPC + adapters.
import request from '@/api/core';
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

export type BridgeType = 'SQLite' | 'PostgreSQL' | 'MySQL' | 'MSSQL' | 'MQTT' | 'NATS';
interface SubrItemType {
    name: string;
    autoStart: boolean;
    state: string;
    task: string;
    bridge: string;
    topic: string;
    type?: string;
    QoS?: string;
    queue?: string;
}
interface SUBR_RES_TYPE extends RES_COMM {
    data: SubrItemType[];
}
interface RES_COMM {
    elapse: string;
    reason: string;
    success: boolean;
}
export interface BridgeItemType {
    name: string;
    type: BridgeType;
    path: string;
    childs?: SubrItemType[];
}
interface BridgeListResType extends RES_COMM {
    data: BridgeItemType[];
}
export interface GenKeyResType extends RES_COMM {
    [key: string]: string | boolean | undefined;
    // TOKEN_INFO
    certificate: string;
    privateKey: string;
    serverKey: string;
    token: string;
    zip: string;
    name?: string | undefined;
}
export interface CreatePayloadType {
    [key: string]: string | number;
    name: string;
    type: BridgeType | '';
    path: string;
}
interface DelResType extends RES_COMM {}
export type CommandBridgeStateType = 'test' | 'exec' | 'query';
export type CommandSubrStateType = 'start' | 'stop';
interface CommandRedType extends RES_COMM {
    data?: {
        column: string[];
        rows: string[][];
    };
}

// Extract a human-readable message from a JSON-RPC error envelope (null when there is no error).
const rpcErrMessage = (res: JsonRpcResponse<unknown>): string | null =>
    res?.error ? res.error.message || `JSON-RPC error ${res.error.code}` : null;

// Build the failure envelope the call sites expect. The bridge/subscriber components read either
// `.data.reason` or `.statusText` on failure, so fill both. Returned as `any` because the same shape
// is reused across several distinct return types (GenKeyResType / CommandRedType / RES_COMM) whose
// `data` fields are otherwise incompatible — the runtime contract (success=false, reason/statusText)
// is what the call sites actually read.
const errEnvelope = (msg: string): any => ({
    success: false,
    reason: msg,
    elapse: '',
    data: { reason: msg },
    statusText: msg,
});

/**
 * Get bridge list — `bridge.list` (params: []).
 * RPC result is `BridgeInfo[]` ({ name, type, path }); adapt into the existing `{ success, data }` envelope.
 */
export const getBridge = async (): Promise<BridgeListResType> => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.bridge.list, []);
        const err = rpcErrMessage(res);
        if (err) return { success: false, reason: err, elapse: '', data: [] };
        const rows = (res?.result ?? []) as any[];
        const data: BridgeItemType[] = rows.map((it) => ({
            name: it?.name ?? it?.Name ?? '',
            type: (it?.type ?? it?.Type ?? '') as BridgeType,
            path: it?.path ?? it?.Path ?? '',
        }));
        return { success: true, reason: 'success', elapse: '', data };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '', data: [] };
    }
};

/**
 * Gen bridge — `bridge.add(name, type, path)` (params order: [name, type, path]).
 * Returns the GenKeyResType-compatible envelope the call site checks (`success` / `data.reason` / `statusText`).
 *
 * NOTE: the RPC handler `addBridge` passes `type` straight to the backend, which matches
 * connector names case-sensitively in lower case (`sqlite`/`mssql`/`postgres`/`mysql`/…).
 * The old REST handler lower-cased both name and type (`strings.ToLower`); the RPC does not,
 * so replicate that here — the dropdown sends capitalized values (`MQTT`, `PostgreSQL`, …)
 * which would otherwise fail with "unsupported type".
 */
export const genBridge = async (aData: CreatePayloadType): Promise<GenKeyResType> => {
    try {
        const res = await rpcCall(RpcMethod.bridge.add, [aData.name.toLowerCase(), aData.type.toLowerCase(), aData.path]);
        const err = rpcErrMessage(res);
        return err ? errEnvelope(err) : ({ success: true, reason: 'success', elapse: '' } as GenKeyResType);
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Delete bridge — `bridge.delete(name)` (params: [name]).
 */
export const delBridge = async (aTargetName: string): Promise<DelResType> => {
    try {
        const res = await rpcCall(RpcMethod.bridge.delete, [aTargetName]);
        const err = rpcErrMessage(res);
        return err ? errEnvelope(err) : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

// Hard cap on total rows so a misbehaving cursor can never spin forever.
const MAX_QUERY_ROWS = 100000;
// Rows requested per fetch. The current backend `bridge.result.fetch(handle)` ignores extra params and
// returns ONE row per call, so this is a no-op today (still 1 row per HTTP round-trip). It is sent as the
// 2nd positional arg so that the moment the backend supports a count
// (`bridge.result.fetch(handle, count)` returning a row batch) the loop below picks it up automatically,
// cutting N round-trips down to ~N/FETCH_COUNT. (Two assumptions to align with the backend: count is the
// 2nd positional param, and the batch is returned in a `rows` field.)
const FETCH_COUNT = 50;

/**
 * Run a SELECT query over a bridge by driving the cursor RPCs:
 *   bridge.query → { handle, columns }, then loop bridge.result.fetch until HasNoRows,
 *   then bridge.result.close (best-effort, always run). Assembles the CommandRedType `data` shape.
 */
const queryBridge = async (aBridgeName: string, aQuery: string): Promise<CommandRedType> => {
    const queryRes = await rpcCall<any>(RpcMethod.bridge.query, [aBridgeName, aQuery]);
    const queryErr = rpcErrMessage(queryRes);
    if (queryErr) return errEnvelope(queryErr);

    const result = queryRes?.result ?? {};
    const handle: string = result?.handle ?? result?.Handle ?? '';
    const columnsRaw: any[] = result?.columns ?? result?.Columns ?? [];
    const column: string[] = columnsRaw.map((c) => c?.name ?? c?.Name ?? '');
    const rows: string[][] = [];

    try {
        while (rows.length < MAX_QUERY_ROWS) {
            const fetchRes = await rpcCall<any>(RpcMethod.bridge.result.fetch, [handle, FETCH_COUNT]);
            const fetchErr = rpcErrMessage(fetchRes);
            if (fetchErr) return errEnvelope(fetchErr);
            const r = fetchRes?.result ?? {};
            if (r?.hasNoRows ?? r?.HasNoRows ?? false) break;
            // Accept both shapes: a batch (`rows`: array of rows, count-aware backend) or a single row
            // (`values`: one row's values, current backend). The batch field name is an assumption — align
            // it with the backend once `bridge.result.fetch(handle, count)` lands.
            const batchRaw = r?.rows ?? r?.Rows;
            const batch: any[][] = Array.isArray(batchRaw) ? batchRaw : [(r?.values ?? r?.Values ?? []) as any[]];
            for (const values of batch) {
                if (rows.length >= MAX_QUERY_ROWS) break;
                rows.push((values as any[]).map((v) => (v === null || v === undefined ? '' : String(v))));
            }
            if (batch.length === 0) break;
        }
    } finally {
        // Always release the cursor, even on error/exception (best-effort — ignore the close result).
        if (handle) {
            try {
                await rpcCall(RpcMethod.bridge.result.close, [handle]);
            } catch {
                /* best-effort close */
            }
        }
    }

    return { success: true, reason: 'success', elapse: '', data: { column, rows } };
};

/**
 * Command bridge — branches on the state:
 *   'test'  → bridge.test(name)            (params: [name])
 *   'exec'  → bridge.exec(name, command)   (params: [name, command])
 *   'query' → bridge.query + bridge.result.fetch* + bridge.result.close cursor (see queryBridge).
 * Preserves the existing test/exec/query return contract so bridge/index.tsx renders unchanged.
 */
export const commandBridge = async (aState: CommandBridgeStateType, aBridgeName: string, aCommand: string | undefined): Promise<CommandRedType> => {
    try {
        if (aState === 'test') {
            const res = await rpcCall<boolean>(RpcMethod.bridge.test, [aBridgeName]);
            const err = rpcErrMessage(res);
            // No `data` on success so the caller stores the whole envelope and reads `.data.success`.
            return err ? errEnvelope(err) : { success: true, reason: 'success', elapse: '' };
        }
        if (aState === 'query') {
            return await queryBridge(aBridgeName, aCommand ?? '');
        }
        // exec: non-SELECT statement → return the exec result inside the success envelope.
        const res = await rpcCall<any>(RpcMethod.bridge.exec, [aBridgeName, aCommand ?? '']);
        const err = rpcErrMessage(res);
        if (err) return errEnvelope(err);
        const r = res?.result ?? {};
        return {
            success: true,
            reason: 'success',
            elapse: '',
            // Surface the exec result fields (no column/rows → rendered as JSON, same as before).
            ...(r && typeof r === 'object' ? r : {}),
        } as CommandRedType;
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/** Subscriber */

/**
 * Get subr list — `schedule.list` (params: []) filtered to type=subscriber.
 * RPC result is the full `Schedule[]`; map subscriber entries into the existing SubrItemType shape.
 * NOTE: the Schedule struct has no `queue` field, so `queue` cannot be populated from this RPC.
 */
export const getSubr = async (): Promise<SUBR_RES_TYPE> => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.schedule.list, []);
        const err = rpcErrMessage(res);
        if (err) return { success: false, reason: err, elapse: '', data: [] };
        const rows = (res?.result ?? []) as any[];
        const data: SubrItemType[] = rows
            .filter((s) => String(s?.type ?? s?.Type ?? '').toLowerCase() === 'subscriber')
            .map((s) => {
                const qos = s?.QoS ?? s?.qos;
                return {
                    name: s?.name ?? s?.Name ?? '',
                    autoStart: Boolean(s?.autoStart ?? s?.AutoStart),
                    state: s?.state ?? s?.State ?? '',
                    task: s?.task ?? s?.Task ?? '',
                    bridge: s?.bridge ?? s?.Bridge ?? '',
                    topic: s?.topic ?? s?.Topic ?? '',
                    type: s?.type ?? s?.Type ?? '',
                    QoS: qos === undefined || qos === null ? undefined : String(qos),
                    queue: s?.queue ?? s?.Queue ?? undefined,
                };
            });
        return { success: true, reason: 'success', elapse: '', data };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '', data: [] };
    }
};
/**
 * Get subr item — stays on REST (no single-item read RPC `schedule.get` exists).
 * @returns subr info
 */
export const getSubrItem = (aSubrName: string): Promise<SubrItemType> => {
    return request({
        method: 'GET',
        url: `/api/subscribers/${aSubrName}`,
    });
};

/**
 * Gen subr — `schedule.subscriber.add(req)` (params: [{name, bridge, command, autoStart, mqtt?, nats?}]).
 * The backend switched from positional args to a single structured payload (neo-server #437):
 * MQTT bridges nest `mqtt: {topic, qos}`, NATS bridges nest `nats: {subject, queueName?}` — the NATS
 * queue group finally has a real slot (it used to be a silently-ignored trailing arg).
 * (`nats.streamName`/JetStream is not sent — the create form never collects it.)
 *
 * The protocol branch follows the form's `bridge_type`; when absent (legacy caller), a payload with a
 * `queue` value falls back to NATS — only the NATS form collects queue — otherwise MQTT.
 *
 * @aData create payload from the form: { name, bridge, topic, task, autoStart, bridge_type?, QoS?, queue? }.
 */
export const genSubr = async (aData: any): Promise<RES_COMM> => {
    try {
        const req: any = {
            name: aData?.name,
            bridge: aData?.bridge,
            command: aData?.task,
            autoStart: Boolean(aData?.autoStart),
        };
        const isNats = aData?.bridge_type ? String(aData.bridge_type).toLowerCase() === 'nats' : Boolean(aData?.queue);
        if (isNats) {
            req.nats = { subject: aData?.topic, ...(aData?.queue ? { queueName: aData.queue } : {}) };
        } else {
            req.mqtt = { topic: aData?.topic, qos: Number(aData?.QoS ?? 0) };
        }
        const res = await rpcCall(RpcMethod.schedule.subscriber.add, [req]);
        const err = rpcErrMessage(res);
        return err ? errEnvelope(err) : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Delete subr — `schedule.delete(name)` (params: [name]).
 * @TargetName string
 * @return status
 */
export const delSubr = async (aTargetName: string): Promise<RES_COMM> => {
    try {
        const res = await rpcCall(RpcMethod.schedule.delete, [aTargetName]);
        const err = rpcErrMessage(res);
        return err ? errEnvelope(err) : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Command Subr — `schedule.stop` when state=stop, otherwise `schedule.start` (params: [name]).
 * @param aState
 * @param aSubrName
 * @returns
 */
export const commandSubr = async (aState: CommandSubrStateType, aSubrName: string): Promise<RES_COMM> => {
    const method = aState === 'stop' ? RpcMethod.schedule.stop : RpcMethod.schedule.start;
    try {
        const res = await rpcCall(method, [aSubrName]);
        const err = rpcErrMessage(res);
        return err ? errEnvelope(err) : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};
