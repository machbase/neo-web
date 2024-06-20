import request from '@/api/core';

export type BridgeType = 'SQLite' | 'PostgreSql' | 'Mysql' | 'MSSQL' | 'MQTT' | 'NATS';
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

/**
 * Get bridge list
 * @returns bridge list
 */
export const getBridge = (): Promise<BridgeListResType> => {
    return request({
        method: 'GET',
        url: `/api/bridges`,
    });
};

/**
 * Gen bridge
 * @name string
 * @type 'SQLite' | 'PostgreSql' | 'Mysql' | 'MSSQL' | 'MQTT'
 * @path string
 * @returns gen info
 */
export const genBridge = (aData: CreatePayloadType): Promise<GenKeyResType> => {
    return request({
        method: 'POST',
        url: `/api/bridges`,
        data: aData,
    });
};

/**
 * Delete bridge
 * @TargetName string
 * @return status
 */
export const delBridge = (aTargetName: string): Promise<DelResType> => {
    return request({
        method: 'DELETE',
        url: `/api/bridges/${aTargetName}`,
    });
};

/**
 * Command bridge
 * @param aState
 * @param aBridgeName
 * @param aCommand
 * @returns
 */
export const commandBridge = (aState: CommandBridgeStateType, aBridgeName: string, aCommand: string | undefined): Promise<CommandRedType> => {
    const sPayload: { state: CommandBridgeStateType; command?: string } = {
        state: aState,
    };
    if (aState !== 'test') sPayload.command = aCommand;

    return request({
        method: 'POST',
        url: `/api/bridges/${aBridgeName}/state`,
        data: sPayload,
    });
};

/** Subscriber */

/**
 * Get subr list
 * @returns subr list
 */
export const getSubr = (): Promise<SUBR_RES_TYPE> => {
    return request({
        method: 'GET',
        url: `/api/subscribers`,
    });
};
/**
 * Get subr item
 * @returns subr info
 */
export const getSubrItem = (aSubrName: string): Promise<SubrItemType> => {
    return request({
        method: 'GET',
        url: `/api/subscribers/${aSubrName}`,
    });
};

/**
 * Gen subr
 * @autostart '--autostart' makes the subscriber starts along with machbase-neo starts. Ommit this to start/stop manually.
 * @name 'nats_subr' the name of the subscriber.
 * @bridge 'my_nats' the name of the bridge that the subscriber is going to use.
 * @topic 'iot.sensor' subject name to subscribe. it should be in NATS subject syntax.
 * @task 'db/append/EXAMPLE:csv' writing descriptor, it means the incoming data is in CSV format and writing data into the table EXAMPLE in append mode.
 * @autostart makes the subscriber will start automatically when machbase-neo starts. If the subscriber is not autostart mode, you can make it start and stop manually by subscriber start and subscriber stop commands.
 * @QoS if the bridge is MQTT type, it specifies the QoS level of the subscription to the topic. It supports 0, 1 and the default is 0 if it is not specified.
 * @queue if the bridge is NATS type, it specifies the Queue Group.
 */
export const genSubr = (aData: SUBR_RES_TYPE): Promise<RES_COMM> => {
    return request({
        method: 'POST',
        url: `/api/subscribers`,
        data: aData,
    });
};

/**
 * Delete subr
 * @TargetName string
 * @return status
 */
export const delSubr = (aTargetName: string): Promise<RES_COMM> => {
    return request({
        method: 'DELETE',
        url: `/api/subscribers/${aTargetName}`,
    });
};

/**
 * Command Subr
 * @param aState
 * @param aSubrName
 * @param aCommand
 * @returns
 */
export const commandSubr = (aState: CommandSubrStateType, aSubrName: string): Promise<RES_COMM> => {
    return request({
        method: 'POST',
        url: `/api/subscribers/${aSubrName}/state`,
        data: { state: aState },
    });
};
