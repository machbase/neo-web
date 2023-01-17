import request from '@/api/core';
import { ResponseData, ResponseList, ResType } from '@/assets/ts/common';
import { ResBoardList, ResPreferences } from '@/interface/tagView';

const getBoardList = async (): Promise<ResBoardList[]> => {
    return ResponseList<ResBoardList[]>(
        await request({
            method: 'GET',
            url: '/api/machiotboard/list',
        }),
        ResType.list
    );
};

const getPreference = async (): Promise<ResPreferences> => {
    return ResponseData<ResPreferences>(
        await request({
            method: 'GET',
            url: '/api/machiotboard/preference/',
        }),
        ResType.data
    );
};

const postSetting = async (params: any): Promise<ResPreferences> => {
    const { theme, home_board, timeout } = params;
    return ResponseData<ResPreferences>(
        await request({
            method: 'POST',
            url: '/api/machiotboard/setting/',
            data: {
                theme,
                home_board,
                timeout,
            },
        }),
        ResType.data
    );
};

const getBoard = (sId: string) => {
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
