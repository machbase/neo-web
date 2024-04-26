// ref: https://github.com/machbase/neo-server/blob/31b78eb95325d4690d178f9a56da2df396d4d5a9/mods/service/httpd/httpd.go#L211
import request from '@/api/core';

export interface TimerItemType {
    name: string;
    schedule: string;
    state: string;
    task: string;
    type: string;
}
interface TimerListResType {
    list: TimerItemType[];
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
    spec: string;
    path: string; // tqlPath
}
interface DelTimerResType {
    elapse: string;
    reason: string;
    success: boolean;
}

/**
 * Get timer list
 * @returns timer list
 */
export const getTimer = (): Promise<TimerListResType> => {
    return request({
        method: 'GET',
        url: `/api/timers`,
    });
};

/**
 * Gen timer
 * @TimerId         string
 * @Data            {AutoStart, Spec, path}
 * @AutoStart       bool    json:"autoStart"
 * @Spec            string  json:"spec"
 * @Path         string  json:"path"
 * @returns         gen timer info
 */
export const genTimer = (aData: CreatePayloadType, aTimerId: string): Promise<GenTimerResType> => {
    return request({
        method: 'POST',
        url: `/api/timers/${aTimerId}/add`,
        data: { ...aData, name: aTimerId },
    });
};

/**
 * Send commands
 * @param aCommand 'string'
 * @param aTimerId 'string'
 * @returns
 */
export const sendTimerCommand = (aCommand: string, aTimerId: string): Promise<any> => {
    return request({
        method: 'POST',
        url: `/api/timers/${aTimerId}/state`,
        data: { state: aCommand },
    });
};

/**
 * Delete timer
 * @aTimerId string
 * @return status
 */
export const delTimer = (aTimerId: string): Promise<DelTimerResType> => {
    return request({
        method: 'DELETE',
        url: `/api/timers/${aTimerId}`,
    });
};
