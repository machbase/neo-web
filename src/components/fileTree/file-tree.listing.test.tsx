import {act, fireEvent, render, waitFor} from '@testing-library/react';
import {RecoilRoot, useRecoilState} from 'recoil';
import request from '@/api/core';
import {FileTree} from './file-tree';
import {gBoardList} from '@/recoil/recoil';
import {gFileTree, gDeleteFileList} from '@/recoil/fileTree';
import {resetFileOperationsForTests} from '@/api/repository/fileWriteQueue';

jest.mock('@/design-system/components', () => ({Toast:{error:jest.fn(),success:jest.fn()},Input:()=>null}));
const originalAdapter = request.defaults.adapter;
afterEach(() => {request.defaults.adapter=originalAdapter; resetFileOperationsForTests();});

for (const kind of ['file','folder']) for (const destination of ['root','folder']) for (const refreshed of [false,true]) {
    test(`${kind} to ${destination}, refreshed=${refreshed}: apply each move only once`, async () => {
        const source = kind==='file' ? '/src/a.wrk' : '/src/bundle';
        const target = (destination==='root' ? '/' : '/dest/') + source.split('/').at(-1);
        const directories = new Set(['/src','/dest',...(kind==='folder'?['/src/bundle']:[])]);
        const disk = new Map(kind==='file' ? [['/src/a.wrk','A'],['/src/b.dsh','B']]
            : [['/src/bundle/a.wrk','A'],['/src/bundle/b.dsh','B'],['/src/peer.sql','PEER']]);
        const parent = (path:string) => path.slice(0,path.lastIndexOf('/')) || '/';
        const name = (path:string) => path.slice(path.lastIndexOf('/')+1);
        const node = (path:string, depth=0):any => ({
            id:path==='/'?'0':name(path),name:path==='/'?'/':name(path),path:path==='/'?'/':parent(path).replace(/\/$/,'')+'/',depth,type:1,isOpen:true,
            dirs:[...directories].filter(p=>parent(p)===path).map(p=>node(p,depth+1)),
            files:[...disk.keys()].filter(p=>parent(p)===path).map(p=>({id:name(p),name:name(p),path:path.replace(/\/$/,'')+'/',depth:depth+1,type:0})),
        });
        const root=node('/'), selected=kind==='file' ? root.dirs[0].files : [...root.dirs[0].dirs,...root.dirs[0].files];
        let release!:()=>void; const gate=new Promise<void>(resolve=>release=resolve), puts:string[]=[];
        request.defaults.adapter=async(config:any)=>{
            const path=decodeURIComponent(config.url.replace('/api/files','')).replace(/\/$/,'') || '/';
            const ok=(data:any)=>({data,status:200,statusText:'OK',headers:{},config});
            if(config.method==='put'){
                puts.push(path); const to=JSON.parse(config.data).destination;
                for(const p of [...disk.keys()])if(p===path||p.startsWith(path+'/')){disk.set(to+p.slice(path.length),disk.get(p)!);disk.delete(p);}
                for(const p of [...directories])if(p===path||p.startsWith(path+'/')){directories.add(to+p.slice(path.length));directories.delete(p);}
                if(path===source)await gate;
                return ok({success:true});
            }
            return ok({success:true,data:{name:name(path),isDir:true,children:[
                ...[...directories].filter(p=>parent(p)===path).map(p=>({name:name(p),isDir:true})),
                ...[...disk.keys()].filter(p=>parent(p)===path).map(p=>({name:name(p),isDir:false})),
            ]}});
        };
        let current:any,publish:any;
        function Host(){const [tree,setTree]=useRecoilState(gFileTree);current=tree;publish=setTree;return <FileTree rootDir={tree as any} selectedFile={undefined} onSelect={()=>{}} onFetchDir={()=>{}} onContextMenu={()=>{}} onSetFileTree={setTree} onRename={()=>{}}/>;}
        const view=render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[]);set(gFileTree,root);set(gDeleteFileList,selected);}}><Host/></RecoilRoot>);
        const item=view.container.querySelector(`[id="${source}-2"]`)!;
        fireEvent.dragStart(item);
        if(destination==='root')fireEvent.dragOver(view.container.querySelector('.rootdropzone')!);
        else fireEvent.dragEnter(view.container.querySelector('[id="/dest-1"]')!);
        fireEvent.dragEnd(item);
        await waitFor(()=>expect(puts).toEqual([source]));
        if(refreshed)act(()=>publish(node('/')));
        await act(async()=>{release();for(let i=0;i<100;i++)await Promise.resolve();});
        await waitFor(()=>expect(puts).toHaveLength(2));
        const lookup=(tree:any,path:string):any[]=>[...tree.files,...tree.dirs].flatMap((n:any)=>[
            ...(n.path+n.name===path?[n]:[]),...(n.type===1?lookup(n,path):[]),
        ]);
        expect(lookup(current,target)).toHaveLength(1);
        expect(lookup(current,source)).toHaveLength(0);
        expect(disk.get(kind==='file'?target:target+'/a.wrk')).toBe('A');
        if(kind==='folder')expect(disk.get(target+'/b.dsh')).toBe('B');
        expect(view.container.querySelectorAll(`[data-testid="file-tree-item-${encodeURIComponent(target)}"]`)).toHaveLength(1);
    });
}
