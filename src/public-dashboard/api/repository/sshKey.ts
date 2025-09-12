// ref: https://github.com/machbase/neo-server/blob/31b78eb95325d4690d178f9a56da2df396d4d5a9/mods/service/httpd/httpd.go#L211
import request from '../api/core';

export interface SSHKEY_ITEM_TYPE {
    keyType: string;
    fingerprint: string;
    comment: string;
}
interface RES_COMMON {
    elapse: string;
    reason: string;
    success: string;
}
interface RES_SSHKEY extends RES_COMMON {
    data: SSHKEY_ITEM_TYPE[];
}

/**
 * Get ssh key list
 * @returns ssh key list
 */
export const getSSHKeys = (): Promise<RES_SSHKEY> => {
    return request({
        method: 'GET',
        url: `/api/sshkeys`,
    });
};

/**
 * Add ssh key
 * @SSHKeyPub string
 */
export const addSSHKey = (aSSHKeyPub: string): Promise<RES_COMMON> => {
    return request({
        method: 'POST',
        url: `/api/sshkeys`,
        data: { key: aSSHKeyPub },
    });
};

/**
 * Delete ssh key
 * @FingerPrt string
 * @return status
 */
export const delSSHKey = (aFingerPrt: string): Promise<RES_COMMON> => {
    return request({
        method: 'DELETE',
        url: `/api/sshkeys/${aFingerPrt}`,
    });
};
