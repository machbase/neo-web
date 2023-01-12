import request from '@/api/core';

const getBoardList = () => {
    return request({
        method: 'GET',
        url: '/api/machiotboard/list',
    });
};

const getPreference = () => {
    return request({
        method: 'GET',
        url: '/api/machiotboard/preference/',
        data: {},
    });
};

const postSetting = (params: any) => {
    const { theme, home_board, timeout } = params;
    return request({
        method: 'POST',
        url: '/api/machiotboard/setting/',
        data: {
            theme,
            home_board,
            timeout,
        },
    });
};

const getBoard = (sId: any) => {
    return request({
        method: 'GET',
        url: `/api/machiotboard/${sId}/`,
    });
};

const putBoard = (params: any) => {
    const { sId, board_name } = params;
    return request({
        method: 'PUT',
        url: `/api/machiotboard/${sId}/`,
        data: {
            board_name,
        },
    });
};

const deleteBoard = (sId: any) => {
    return request({
        method: 'DELETE',
        url: `/api/machiotboard/${sId}/`,
    });
};

export { getBoardList, postSetting, getPreference, deleteBoard, putBoard, getBoard };
