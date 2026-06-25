// timer(schedule) repository — migrated to the machbase-neo UI-API (JSON-RPC) (#1334 phase 3, Wave A).
//
// Migrated (RPC exists): list→schedule.list (filtered to type=timer), gen→schedule.timer.add,
//                        state(start/stop)→schedule.start/stop, delete→schedule.delete.
// Kept on REST: getTimerItem (no single-item get RPC), modTimer (no schedule.update RPC yet, BE-6).
import request from '@/api/core';
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
 * Get timer list — `schedule.list` (filter the full schedule list down to type=timer).
 */
export const getTimer = async (): Promise<TimerListResType> => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.schedule.list, []);
        const err = rpcErrMessage(res);
        if (err) return { success: false, reason: err, elapse: '', data: [] };
        const rows = (res?.result ?? []) as any[];
        const data: TimerItemType[] = rows
            .filter((s) => String(s?.type ?? '').toLowerCase() === 'timer')
            .map((s) => ({
                name: s?.name ?? '',
                schedule: s?.schedule ?? '',
                state: s?.state ?? '',
                task: s?.task ?? '',
                type: s?.type ?? '',
                autoStart: Boolean(s?.autoStart),
            }));
        return { success: true, reason: 'success', elapse: '', data };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '', data: [] };
    }
};

/**
 * Get timer item — stays on REST (no single-item read RPC (schedule.get) exists).
 */
export const getTimerItem = (aTimerName: string): Promise<TimerItemType> => {
    return request({
        method: 'GET',
        url: `/api/timers/${aTimerName}`,
    });
};

/**
 * Gen timer — `schedule.timer.add(name, spec, command, autoStart)`.
 */
export const genTimer = async (aData: CreatePayloadType, aTimerId: string): Promise<GenTimerResType> => {
    try {
        const res = await rpcCall(RpcMethod.schedule.timer.add, [aTimerId, aData.schedule, aData.path, aData.autoStart]);
        const err = rpcErrMessage(res);
        return err ? { success: false, reason: err, elapse: '', statusText: err } : { success: true, reason: 'success', elapse: '' };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, reason: msg, elapse: '', statusText: msg };
    }
};

/**
 * Edit timer — stays on REST (no `schedule.update` RPC yet, pending BE-6 enhancement).
 */
export const modTimer = (aData: EditPayloadType, aTimerId: string): Promise<GenTimerResType> => {
    return request({
        method: 'PUT',
        url: `/api/timers/${aTimerId}`,
        data: aData,
    });
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
