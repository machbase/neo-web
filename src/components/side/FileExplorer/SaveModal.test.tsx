import {render, fireEvent, screen, waitFor} from '@testing-library/react';
import {RecoilRoot, useRecoilValue} from 'recoil';
import {gBoardList,gSelectedTab} from '@/recoil/recoil';
import request from '@/api/core';
import {AxiosError} from 'axios';
import {SaveModal} from './SaveModal';

jest.mock('@/utils/UpdateTree', () => ({TreeFetchDrilling: jest.fn(async (tree) => ({tree, exist:false}))}));

it.each(['report.dsh', 'Report.DSH'])('checks the existing file %s in a folder containing #', async existing => {
    const same = '/Keep #1/' + existing;
    const files = new Map([[same,'previous report']]);
    const dir = {name:'Keep #1',isDir:true,type:'dir',lastModifiedUnixMillis:0};
    const boardFile = {name:existing,isDir:false,type:'.dsh',lastModifiedUnixMillis:0};
    const origin = 'http://fixture.invalid';
    const calls:Array<[string | undefined,string,string]> = [];
    const savedAdapter = request.defaults.adapter;
    request.defaults.adapter = async (config) => {
        const url = new URL(request.getUri(config), origin);
        const path = decodeURIComponent(url.pathname.slice('/web/api/files'.length));
        calls.push([config.method, path, url.search]);
        if (config.method === 'post' && path.endsWith('.dsh')) files.set(path, config.data);
        let data:unknown;
        if (config.method === 'post') data = path.endsWith('.dsh') ? {success:true} : {success:false};
        else if (path === '/' || path === '') data = {success:true,data:{isDir:true,children:[dir]}};
        else if ((path === '/Keep #1' || path === '/Keep #1/')) data = {success:true,data:{isDir:true,children:[boardFile]}};
        else if (path === same || path === '/Keep #1/report.dsh') data = 'previous report';
        else throw new AxiosError('Not found','ERR_BAD_REQUEST',config,undefined,{config,data:{success:false,reason:'not found'},status:404,headers:{},statusText:'Not Found'});
        return {config,data,status:200,headers:{},statusText:'OK'};
    };
    const confirm = jest.spyOn(window,'confirm').mockReturnValue(false);
    try {
        render(<RecoilRoot initializeState={({set}) => {
            set(gSelectedTab,'source');
            set(gBoardList,[{id:'source',type:'dsh',name:'source.dsh',path:'/',code:'',panels:[],range_bgn:'',range_end:'',sheet:[],savedCode:true,dashboard:{title:'Copy'}}]);
        }}><SaveModal pIsSave setIsOpen={jest.fn()}/></RecoilRoot>);
        fireEvent.click(await screen.findByText('Keep #1'),{detail:2});
        await waitFor(() => expect(calls.some(([method,path]) => method === 'get' && path !== '/')).toBe(true));
        fireEvent.change(screen.getByDisplayValue('source.dsh'),{target:{value:'report.dsh'}});
        fireEvent.click(screen.getByRole('button',{name:'Apply'}));
        await waitFor(() => expect(confirm.mock.calls.length + calls.filter(([method]) => method === 'post').length).toBeGreaterThan(0));
        await waitFor(() => expect(screen.queryByRole('button',{name:'Apply'})).not.toBeDisabled());
        expect(confirm).toHaveBeenCalledWith('Do you want to overwrite it?');
        expect(files.get(same)).toBe('previous report');
    } finally {
        request.defaults.adapter = savedAdapter;
        confirm.mockRestore();
    }
});

it('Save As with another spelling of the same resolved file preserves the tab doing the save',async () => {
    const adapter = request.defaults.adapter;
    const respond = (config: any, data: any) => ({ config, data, status: 200, headers: {}, statusText: 'OK' });
    const confirm = jest.spyOn(window,'confirm').mockReturnValue(true);
    request.defaults.adapter = async config => {
        const url = new URL(request.getUri(config), 'http://fixture.invalid');
        const name = decodeURIComponent(url.pathname.slice('/web/api/files'.length));
        if (config.method === 'post') return respond(config,{success:true,reason:'success'});
        if (name === '/reports/' || name === '/reports') {
            return respond(config,{success:true,data:{name:'reports',isDir:true,children:[{name:'Report.dsh',isDir:false,type:'.dsh'}]}});
        }
        if (name === '/reports/Report.dsh' || name === '/reports/report.dsh') return respond(config,JSON.stringify({dashboard:{title:'selected'}}));
        throw new Error('Unexpected route '+url.href);
    };
    function Capture() {
        const boards = useRecoilValue(gBoardList);
        return <output data-testid="open-boards">{JSON.stringify(boards.map(board => [board.id, board.name]))}</output>;
    }
    try {
        const close=jest.fn();
        render(<RecoilRoot initializeState={({set})=>{
            set(gSelectedTab,'source');
            set(gBoardList,[{id:'source',type:'dsh',name:'Report.dsh',path:'/reports/',code:'',panels:[],range_bgn:'',range_end:'',sheet:[],savedCode:true,dashboard:{title:'source'}}]);
        }}><SaveModal pIsSave setIsOpen={close}/><Capture/></RecoilRoot>);
        fireEvent.change(await screen.findByDisplayValue('Report.dsh'),{target:{value:'report.dsh'}});
        fireEvent.click(screen.getByRole('button',{name:'Apply'}));
        await waitFor(()=>expect(close).toHaveBeenCalledWith(false));
        const boards=JSON.parse(screen.getByTestId('open-boards').textContent!);
        expect(boards).toEqual([['source','Report.dsh']]);
    } finally {
        request.defaults.adapter=adapter;
        confirm.mockRestore();
    }
});
