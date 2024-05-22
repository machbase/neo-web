import request from '@/api/core';

export type BridgeType = 'SQLite' | 'PostgreSql' | 'Mysql' | 'MSSQL' | 'MQTT';
export interface BridgeItemType {
    name: string;
    type: BridgeType;
    path: string;
}
interface BridgeListResType {
    data: BridgeItemType[];
    elapse: string;
    reason: string;
    success: boolean;
}
export interface GenKeyResType {
    [key: string]: string | boolean | undefined;
    success: boolean;
    elapse: string;
    reason: string;
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
interface DelResType {
    elapse: string;
    reason: string;
    success: boolean;
}
export type CommandBridgeStateType = 'test' | 'exec' | 'query';
interface CommandRedType {
    elapse: string;
    reason: string;
    success: boolean;
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
