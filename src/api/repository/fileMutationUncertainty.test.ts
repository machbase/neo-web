import request from '@/api/core';
import {getFiles,moveFile} from './fileTree';
import {postFileList} from './api';
import {cancelAllPendingFileWrites,readFileConsistently} from './fileWriteQueue';
import {rememberFileIdentity} from '@/utils/fileIdentity';

jest.mock('@/api/core',()=>({__esModule:true,default:jest.fn()}));
const missing={status:404,headers:{},data:{reason:'not found'}};
beforeEach(()=>{cancelAllPendingFileWrites();jest.mocked(request).mockReset();});

// Policy revision: physical observations never settle a request whose original
// acknowledgement was lost. Keep each format/operation/gateway combination.
for(const type of ['wrk','dsh'])for(const mode of ['open','save-as'])for(const status of [0,502,503,504]) {
 test(`${type}: ${mode} remains protected after lost ${status||'transport'} ACK and physical completion`,async()=>{
  const source='/src/a.'+type,target='/dest/a.'+type,disk=new Map([[source,'ORIGINAL']]),posts:string[]=[];
  jest.mocked(request).mockImplementation(async(c:any)=>{
   const path=c.url.replace('/api/files','');
   if(c.method==='PUT')return(status?{status,headers:{},data:{reason:'gateway'}}:{isAxiosError:true}) as any;
   if(c.method==='POST'){posts.push(path);disk.set(path,c.data);return{success:true} as any;}
   return(disk.get(path)??missing) as any;
  });
  await moveFile(source,target);disk.set(target,disk.get(source)!);disk.delete(source);
  expect(await getFiles(target)).toBe('ORIGINAL'); // observation, not request end
  if(mode==='open')expect(await readFileConsistently(source,()=>getFiles(source))).toMatchObject({success:false});
  else expect(await postFileList('STALE','/src/','a.'+type)).toMatchObject({success:false});
  expect(await postFileList('UNSAFE','/dest/','a.'+type)).toMatchObject({success:false});
  expect(posts).toEqual([]);expect(disk.get(target)).toBe('ORIGINAL');expect(disk.has(source)).toBe(false);
  expect(await postFileList('DRAFT','/','rescue.'+type)).toMatchObject({success:true});
  expect(posts).toEqual(['/rescue.'+type]);expect(disk.get('/rescue.'+type)).toBe('DRAFT');
 });
}

test('verified separate Unicode names remain usable while a source alias stays protected',async()=>{
 for(const name of ['SS.wrk','ß.wrk'])rememberFileIdentity('/'+name,'/'+name);
 rememberFileIdentity('/ss.wrk','/SS.wrk');
 jest.mocked(request).mockImplementation(async(c:any)=>(c.method==='PUT'?{isAxiosError:true}:{success:true}) as any);
 await moveFile('/SS.wrk','/moved.wrk');
 expect(await postFileList('BLOCKED','/','ss.wrk')).toMatchObject({success:false});
 expect(await postFileList('KEPT','/','ß.wrk')).toMatchObject({success:true});
});

test('logout does not make a lost move safe for a new account',async()=>{
 jest.mocked(request).mockResolvedValue({isAxiosError:true} as any);
 await moveFile('/old.wrk','/new.wrk');cancelAllPendingFileWrites();
 expect(await postFileList('NEW ACCOUNT','/','old.wrk')).toMatchObject({success:false});
 expect(await moveFile('/new.wrk','/elsewhere.wrk')).toMatchObject({success:false});
 expect(request).toHaveBeenCalledTimes(1);
});
