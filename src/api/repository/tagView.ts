import { ResBoardList } from '@/interface/tagView';
import { ResponsePattern, ResType } from '@/assets/ts/common';
import request from '@/api/core';

const getBoardList = () => {
    return request({
        method: 'GET',
        url: '/api/machiotboard/list',
    });
};

export { getBoardList };
