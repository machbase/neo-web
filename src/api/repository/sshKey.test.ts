import { getSSHKeys, addSSHKey, delSSHKey } from './sshKey';
import { rpcCall, RpcMethod } from './rpc';

// sshKey.ts는 저수준 `rpcCall`만 호출하므로 그것만 모킹하고, RpcMethod 등 나머지는
// 실제 구현을 그대로 사용한다(메서드 이름 회귀까지 검증하기 위함).
jest.mock('./rpc', () => {
    const actual = jest.requireActual('./rpc');
    return {
        ...actual,
        rpcCall: jest.fn(),
    };
});

const mockedRpcCall = rpcCall as jest.MockedFunction<typeof rpcCall>;

const ok = <T>(result: T) => ({ jsonrpc: '2.0' as const, id: 1, result });
const fail = (code: number, message: string) => ({ jsonrpc: '2.0' as const, id: 1, error: { code, message } });

describe('sshKey.ts — UI-API(JSON-RPC) named wrappers + REST 봉투 adapter', () => {
    beforeEach(() => {
        mockedRpcCall.mockReset();
    });

    describe('getSSHKeys → sshkey.list', () => {
        it('sshkey.list를 빈 params로 호출한다', async () => {
            mockedRpcCall.mockResolvedValue(ok([]));
            await getSSHKeys();
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.sshkey.list, []);
        });

        it('PascalCase 결과(json 태그 없는 AuthorizedSshKey)를 camelCase로 정규화한다', async () => {
            mockedRpcCall.mockResolvedValue(
                ok([{ KeyType: 'ssh-rsa', Fingerprint: 'SHA256:abc', Comment: 'laptop' }])
            );
            const res = await getSSHKeys();
            expect(res).toEqual({
                success: true,
                reason: 'success',
                elapse: '',
                data: [{ keyType: 'ssh-rsa', fingerprint: 'SHA256:abc', comment: 'laptop' }],
            });
        });

        it('camelCase 결과도 그대로 통과시키고 누락 필드는 빈 문자열로 채운다', async () => {
            mockedRpcCall.mockResolvedValue(ok([{ keyType: 'ssh-ed25519', fingerprint: 'SHA256:xyz' }]));
            const res = await getSSHKeys();
            expect(res.data).toEqual([{ keyType: 'ssh-ed25519', fingerprint: 'SHA256:xyz', comment: '' }]);
        });

        it('result가 null/undefined면 빈 배열을 반환한다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            const res = await getSSHKeys();
            expect(res).toMatchObject({ success: true, data: [] });
        });

        it('JSON-RPC error면 success:false + data:[]로 봉투화한다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, 'boom'));
            const res = await getSSHKeys();
            expect(res).toMatchObject({ success: false, reason: 'boom', data: [] });
        });

        it('transport reject면 catch해서 success:false + data:[]로 변환한다', async () => {
            mockedRpcCall.mockRejectedValue(new Error('socket closed'));
            const res = await getSSHKeys();
            expect(res).toMatchObject({ success: false, reason: 'socket closed', data: [] });
        });
    });

    describe('addSSHKey → sshkey.add(keyType, key, comment)', () => {
        it('pubkey 문자열을 keyType/key/comment 3개 위치인자로 분리해 전달한다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await addSSHKey('ssh-rsa AAAAB3NzaC1yc2E user@host');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.sshkey.add, [
                'ssh-rsa',
                'AAAAB3NzaC1yc2E',
                'user@host',
            ]);
        });

        it('comment에 공백이 있으면 나머지를 모두 합쳐 comment로 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await addSSHKey('ssh-ed25519 AAAAC3Nz my work laptop');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.sshkey.add, [
                'ssh-ed25519',
                'AAAAC3Nz',
                'my work laptop',
            ]);
        });

        it('앞뒤 공백/중복 공백을 무시하고 comment 없으면 빈 문자열로 채운다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await addSSHKey('  ssh-rsa   AAAAB3Nz  ');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.sshkey.add, ['ssh-rsa', 'AAAAB3Nz', '']);
        });

        it('성공 시 success:true 봉투를 반환한다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            const res = await addSSHKey('ssh-rsa AAAAB3Nz user@host');
            expect(res).toMatchObject({ success: true, reason: 'success' });
        });

        it('JSON-RPC error면 success:false + statusText를 채운다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32602, 'invalid key'));
            const res: any = await addSSHKey('ssh-rsa AAAAB3Nz user@host');
            expect(res).toMatchObject({ success: false, reason: 'invalid key', statusText: 'invalid key' });
        });

        it('transport reject면 catch해서 success:false로 변환한다', async () => {
            mockedRpcCall.mockRejectedValue(new Error('timeout'));
            const res = await addSSHKey('ssh-rsa AAAAB3Nz user@host');
            expect(res).toMatchObject({ success: false, reason: 'timeout' });
        });
    });

    describe('delSSHKey → sshkey.delete(key)', () => {
        it('fingerprint를 단일 위치인자로 전달한다(과거 REST의 삭제 식별자와 동일)', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await delSSHKey('SHA256:abc');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.sshkey.delete, ['SHA256:abc']);
        });

        it('성공 시 success:true 봉투를 반환한다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            const res = await delSSHKey('SHA256:abc');
            expect(res).toMatchObject({ success: true, reason: 'success' });
        });

        it('JSON-RPC error면 success:false + statusText를 채운다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, 'not found'));
            const res: any = await delSSHKey('SHA256:missing');
            expect(res).toMatchObject({ success: false, reason: 'not found', statusText: 'not found' });
        });

        it('transport reject면 catch해서 success:false로 변환한다', async () => {
            mockedRpcCall.mockRejectedValue(new Error('disconnected'));
            const res = await delSSHKey('SHA256:abc');
            expect(res).toMatchObject({ success: false, reason: 'disconnected' });
        });
    });
});
