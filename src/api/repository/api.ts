import request from '@/api/core';
import { ResponseData, ResponseList, ResType } from '@/assets/ts/common';
import { BoardInfo } from '@/interface/chart';
import { ResBoardList, ResPreferences } from '@/interface/tagView';

const postNewBoard = async (params: any) => {
    return await request({
        method: 'POST',
        url: '/api/machiotboard/',
        data: params,
    });
};
const putNewBoard = async (params: any) => {
    return await request({
        method: 'PUT',
        url: '/api/machiotboard/',
        data: params,
    });
};
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

const getBoard = async (sId: string): Promise<BoardInfo> => {
    return ResponseData<BoardInfo>(
        await request({
            method: 'GET',
            url: `/api/machiotboard/${sId}/`,
        }),
        ResType.data
    );
};

const putBoard = async (params: any): Promise<ResBoardList[]> => {
    const { sId, board_name } = params;
    return ResponseList<ResBoardList[]>(
        await request({
            method: 'PUT',
            url: `/api/machiotboard/${sId}/`,
            data: {
                board_name,
            },
        }),
        ResType.list
    );
};

const deleteBoard = (sId: any) => {
    return request({
        method: 'DELETE',
        url: `/api/machiotboard/${sId}/`,
    });
};

const getDataDefault = async () => {
    return await request({
        method: 'GET',
        url: '/api/machiotchart/default/',
    });
};

export { getBoardList, postSetting, getPreference, deleteBoard, putBoard, getBoard, getDataDefault, postNewBoard, putNewBoard };
