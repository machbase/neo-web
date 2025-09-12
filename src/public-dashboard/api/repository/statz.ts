import request from '../core';

/**
 * Get statz table configuration
 * @returns current statz table configuration
 */
export const getStatzConfig = () => {
    return request({
        method: 'GET',
        url: '/api/statz/config',
    });
};

/**
 * Set statz table configuration
 * @param tableName table name to set
 * @returns operation result
 */
export const setStatzConfig = (tableName: string) => {
    return request({
        method: 'POST',
        url: '/api/statz/config',
        data: {
            out: tableName,
        },
    });
};