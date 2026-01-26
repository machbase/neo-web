import request from '@/api/core';

export interface MediaServerType {
    ip: string;
    port: string;
}

interface MediaServerResType {
    data: MediaServerType;
    elapse: string;
    reason: string;
    success: boolean;
}

interface MediaServerUpdateResType {
    elapse: string;
    reason: string;
    success: boolean;
}

/**
 * Get media server settings
 * @returns media server ip and port
 */
export const getMediaServer = (): Promise<MediaServerResType> => {
    return request({
        method: 'GET',
        url: `/api/media-server`,
    });
};

/**
 * Update media server settings
 * @param aData { ip, port }
 * @returns update status
 */
export const updateMediaServer = (aData: MediaServerType): Promise<MediaServerUpdateResType> => {
    return request({
        method: 'PUT',
        url: `/api/media-server`,
        data: aData,
    });
};

export interface CameraInfo {
    name: string;
    id: string;
}

interface CameraListResType {
    data: CameraInfo[];
    elapse: string;
    reason: string;
    success: boolean;
}

/**
 * Get camera list by table name (columns with meta='camera')
 * @param tableName table name to query cameras from
 * @returns camera list
 */
export const getCameraListByTable = (tableName: string): Promise<CameraListResType> => {
    return request({
        method: 'GET',
        url: `/api/cameras?table=${encodeURIComponent(tableName)}`,
    });
};
