// timer(schedule) repository — migrated to the machbase-neo UI-API (JSON-RPC) (#1334 phase 3, Wave A).
//
// Fully migrated — this repository no longer touches a REST endpoint:
//   list→schedule.list (filtered to type=timer), gen→schedule.timer.add, getTimerItem→schedule.get,
//   modTimer→schedule.update, state(start/stop)→schedule.start/stop, delete→schedule.delete.
// `schedule.get` / `schedule.update` landed after the first wave, replacing the last two REST calls
// (`GET|PUT /api/timers/:name`).
import { rpcCall, RpcMethod, JsonRpcResponse } from './rpc';

export interface TimerItemType {
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
    [key: string]: string | boolean | undefined;
    success: boolean;
    elapse: string;
    reason: string;
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
 * Map one `schedule.*` RPC row (backend `scheduler.Schedule`) into TimerItemType.
 * Every field of that struct is tagged `omitempty`, so `autoStart:false` and empty
 * `schedule`/`task` arrive as MISSING keys — always default here, never let
 * `undefined` reach the edit form.
 */
const toTimerItem = (s: any): TimerItemType => ({
    name: s?.name ?? '',
    schedule: s?.schedule ?? '',
    state: s?.state ?? '',
    task: s?.task ?? '',
    type: s?.type ?? '',
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
 * Get timer list — `schedule.list` (filter the full schedule list down to type=timer).
 */
export const getTimer = async (): Promise<TimerListResType> => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.schedule.list, []);
        const err = rpcErrMessage(res);
        if (err) return { success: false, reason: err, elapse: '', data: [] };
        const rows = (res?.result ?? []) as any[];
        const data: TimerItemType[] = rows.filter((s) => String(s?.type ?? '').toLowerCase() === 'timer').map(toTimerItem);
        return { success: true, reason: 'success', elapse: '', data };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '', data: [] };
    }
};

/**
 * Get timer item — `schedule.get(name)` (params: [name]).
 * The backend lowercases the name internally and resolves timers and subscribers alike;
 * this repository only ever asks for timer names.
 */
export const getTimerItem = async (aTimerName: string): Promise<TimerItemResType> => {
    try {
        const res = await rpcCall<any>(RpcMethod.schedule.get, [aTimerName]);
        const err = rpcErrMessage(res);
        if (err) return errEnvelope(err);
        return { success: true, reason: 'success', elapse: '', data: toTimerItem(res?.result) };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Gen timer — `schedule.timer.add(req)` (params: [{name, spec, command, autoStart}]).
 * The backend switched from positional args to a single structured payload (neo-server #437).
 */
export const genTimer = async (aData: CreatePayloadType, aTimerId: string): Promise<GenTimerResType> => {
    try {
        const res = await rpcCall(RpcMethod.schedule.timer.add, [{ name: aTimerId, spec: aData.schedule, command: aData.path, autoStart: Boolean(aData.autoStart) }]);
        const err = rpcErrMessage(res);
        return err ? errEnvelope(err) : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Edit timer — `schedule.update(req)` (params: [{name, spec, command, autoStart}]).
 * Same structured-payload shape as `schedule.timer.add`. The backend resolves the entry with
 * `LoadTimer`, so this is timer-only — a subscriber name fails here by design.
 */
export const modTimer = async (aData: EditPayloadType, aTimerId: string): Promise<GenTimerResType> => {
    try {
        const res = await rpcCall(RpcMethod.schedule.update, [
            { name: aTimerId, spec: aData.schedule, command: aData.path, autoStart: Boolean(aData.autoStart) },
        ]);
        const err = rpcErrMessage(res);
        return err ? errEnvelope(err) : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return errEnvelope(e instanceof Error ? e.message : String(e));
    }
};

/**
 * Send command — `schedule.start` / `schedule.stop` (branch on the state value).
 */
export const sendTimerCommand = async (aCommand: string, aTimerId: string): Promise<any> => {
    const method = /stop/i.test(aCommand) ? RpcMethod.schedule.stop : RpcMethod.schedule.start;
    try {
        const res = await rpcCall(method, [aTimerId]);
        const err = rpcErrMessage(res);
        return err ? { success: false, reason: err } : { success: true, reason: 'success' };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e) };
    }
};

/**
 * Delete timer — `schedule.delete(name)`.
 */
export const delTimer = async (aTimerId: string): Promise<DelTimerResType> => {
    try {
        const res = await rpcCall(RpcMethod.schedule.delete, [aTimerId]);
        const err = rpcErrMessage(res);
        return err ? { success: false, reason: err, elapse: '' } : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '' };
    }
};
