// timer(schedule) repository — machbase-neo UI-API (JSON-RPC), `timer.*` namespace.
//
// neo-server PR #474 split `schedule.*` into `timer.*` / `subscriber.*` and REMOVED the old
// namespace in the same commit — every `schedule.*` call now answers `-32601 Method not found`,
// so there is no compatibility window and nothing here may fall back.
//
// The identity of an entry changed from its NAME to a numeric `id`:
//   list→timer.list, get→timer.get(id), add→timer.add(req) (returns the new id),
//   update→timer.update({id, …}), start/stop→timer.start|stop(id), delete→timer.delete(id).
// Passing a name string where an id is expected fails loudly with `-32602 unmarshal to int64`,
// so a missed call site can never silently act on the wrong entry.
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

export interface TimerItemType {
    /** Server-assigned identity. Every mutating RPC addresses the timer by this, never by name. */
    id: number;
    name: string;
    schedule: string;
    state: string;
    task: string;
    type: string;
    autoStart: boolean;
}
interface TimerListResType {
    data: TimerItemType[];
    elapse: string;
    reason: string;
    success: boolean;
}
export interface TimerItemResType {
    data: TimerItemType;
    elapse: string;
    reason: string;
    success: boolean;
    statusText?: string;
}
export interface GenTimerResType {
    [key: string]: string | number | boolean | undefined;
    success: boolean;
    elapse: string;
    reason: string;
    /** `timer.add` returns the created id — use it instead of re-reading the list by name. */
    id?: number;
}
export interface CreatePayloadType {
    [key: string]: string | boolean;
    autoStart: boolean;
    schedule: string;
    path: string; // tqlPath
}
export interface EditPayloadType {
    [key: string]: string | boolean;
    autoStart: boolean;
    schedule: string;
    path: string; // tqlPath
}
interface DelTimerResType {
    elapse: string;
    reason: string;
    success: boolean;
}

const rpcErrMessage = (res: JsonRpcResponse<unknown>): string | null =>
    res?.error ? res.error.message || `JSON-RPC error ${res.error.code}` : null;

/**
 * Map one `timer.*` RPC row (backend `timer.Info`) into TimerItemType.
 *
 * Every field of that struct is tagged `omitempty`, so `autoStart:false` and empty
 * `schedule`/`task` arrive as MISSING keys — always default here, never let
 * `undefined` reach the edit form.
 *
 * `timer.Info` also dropped the `type` discriminator that `scheduler.Schedule` carried (the
 * namespace itself is the type now), so fill it in as a constant: the timer screens still read
 * `type` for display.
 */
const toTimerItem = (s: any): TimerItemType => ({
    id: Number(s?.id ?? 0),
    name: s?.name ?? '',
    schedule: s?.schedule ?? '',
    state: s?.state ?? '',
    task: s?.task ?? '',
    type: s?.type ?? 'TIMER',
    autoStart: Boolean(s?.autoStart),
});

// Failure envelope the timer call sites expect. They read `.reason` first, but older branches still
// fall back to `.data.reason` / `.statusText`, so fill all three.
const errEnvelope = (msg: string): any => ({
    success: false,
    reason: msg,
    elapse: '',
    data: { reason: msg },
    statusText: msg,
});

/**
 * Get timer list — `timer.list` (params: []).
 * The namespace is timer-only, so there is no `type` filtering to do any more.
 * NOTE: the backend scopes the list to the logged-in user's own definitions (no SYS bypass),
 * so this no longer returns every user's timers.
 */
export const getTimer = async (): Promise<TimerListResType> => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.timer.list, []);
        const err = rpcErrMessage(res);
        if (err) return { success: false, reason: err, elapse: '', data: [] };
        const rows = (res?.result ?? []) as any[];
        return { success: true, reason: 'success', elapse: '', data: rows.map(toTimerItem) };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '', data: [] };
    }
};

/**
 * Get timer item — `timer.get(id)` (params: [id]).
 * The id comes from `timer.list` / `timer.add`; a name string is rejected by the backend.
 */
export const getTimerItem = async (aTimerId: number): Promise<TimerItemResType> => {
    try {
        const res = await rpcCall<any>(RpcMethod.timer.get, [aTimerId]);
        const err = rpcErrMessage(res);
        if (err) return errEnvelope(err);
        return { success: true, reason: 'success', elapse: '', data: toTimerItem(res?.result) };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Gen timer — `timer.add(req)` (params: [{name, spec, command, autoStart}]).
 *
 * The request payload is unchanged from `schedule.timer.add`; only the method name and the return
 * differ — the RPC now answers with the created id, which the caller should keep instead of
 * looking the new timer up by name.
 *
 * Two backend behaviours changed here and surface as plain `reason` text:
 * - a duplicate name is now an error (`schedule name '…' already exists`); it used to overwrite
 *   the existing timer silently.
 * - a `command` whose tql file does not exist fails BEFORE the definition is stored, so a failed
 *   create leaves nothing behind.
 */
export const genTimer = async (aData: CreatePayloadType, aTimerName: string): Promise<GenTimerResType> => {
    try {
        const res = await rpcCall<number>(RpcMethod.timer.add, [
            { name: aTimerName, spec: aData.schedule, command: aData.path, autoStart: Boolean(aData.autoStart) },
        ]);
        const err = rpcErrMessage(res);
        if (err) return errEnvelope(err);
        return { success: true, reason: 'success', elapse: '', id: Number(res?.result ?? 0) };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Edit timer — `timer.update(req)` (params: [{id, spec, command, autoStart}]).
 *
 * The entry is addressed by id; `name` is not part of the request and cannot be changed.
 *
 * IMPORTANT: the backend REPLACES the definition rather than merging it — a field left out of the
 * payload is reset (omitting `autoStart` turns it off). Always send the full set below.
 */
export const modTimer = async (aData: EditPayloadType, aTimerId: number): Promise<GenTimerResType> => {
    try {
        const res = await rpcCall(RpcMethod.timer.update, [
            { id: aTimerId, spec: aData.schedule, command: aData.path, autoStart: Boolean(aData.autoStart) },
        ]);
        const err = rpcErrMessage(res);
        return err ? errEnvelope(err) : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Send command — `timer.start` / `timer.stop` (params: [id]).
 */
export const sendTimerCommand = async (aCommand: string, aTimerId: number): Promise<any> => {
    const method = /stop/i.test(aCommand) ? RpcMethod.timer.stop : RpcMethod.timer.start;
    try {
        const res = await rpcCall(method, [aTimerId]);
        const err = rpcErrMessage(res);
        return err ? { success: false, reason: err } : { success: true, reason: 'success' };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e) };
    }
};

/**
 * Delete timer — `timer.delete(id)` (params: [id]).
 */
export const delTimer = async (aTimerId: number): Promise<DelTimerResType> => {
    try {
        const res = await rpcCall(RpcMethod.timer.delete, [aTimerId]);
        const err = rpcErrMessage(res);
        return err ? { success: false, reason: err, elapse: '' } : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '' };
    }
};
