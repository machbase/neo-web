// ref: https://github.com/machbase/neo-server/blob/31b78eb95325d4690d178f9a56da2df396d4d5a9/mods/service/httpd/httpd.go#L211
import request from '../api/core';

export interface KeyItemType {
    id: string;
    idx: number;
    notAfter: number;
    notBefore: number;
}
interface KeyListResType {
    data: KeyItemType[];
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
    notBefore: number;
    notAfter: number;
}
interface DelKeyResType {
    elapse: string;
    reason: string;
    success: boolean;
}

/**
 * Get security key list
 * @returns key list
 */
export const getKeyList = (): Promise<KeyListResType> => {
    return request({
        method: 'GET',
        url: `/api/keys`,
    });
};

/**
 * Gen security key
 * @Data {name, notBefore, notAfter}
 * @Name      string `json:"name"`
 * @NotBefore int64  `json:"notBefore"`
 * @NotAfter  int64  `json:"notAfter"`
 * @returns gen key info
 */
export const genKey = (aData: CreatePayloadType): Promise<GenKeyResType> => {
    return request({
        method: 'POST',
        url: `/api/keys`,
        data: aData,
    });
};

/**
 * Delete security key
 * @aTargetKeyName string
 * @return status
 */
export const delKey = (aTargetKeyName: string): Promise<DelKeyResType> => {
    return request({
        method: 'DELETE',
        url: `/api/keys/${aTargetKeyName}`,
    });
};
