import { getKeyList, delKey } from './key';
import { rpcCall, RpcMethod } from './rpc';

// key.ts는 저수준 `rpcCall`만 호출하므로 그것만 모킹하고, RpcMethod 등 나머지는
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

describe('key.ts — key.list의 id/name 분리 (server PR #469)', () => {
    beforeEach(() => {
        mockedRpcCall.mockReset();
    });

    describe('getKeyList → key.list', () => {
        it('숫자 id와 CommonName인 name을 분리해서 매핑한다', async () => {
            mockedRpcCall.mockResolvedValue(ok([{ idx: 0, id: 10, name: 'client-a', notBefore: 1788311456, notAfter: 2103671456 }]));

            const sRes = await getKeyList();

            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.key.list, []);
            expect(sRes.success).toBe(true);
            expect(sRes.data).toEqual([{ id: 10, idx: 0, name: 'client-a', notBefore: 1788311456, notAfter: 2103671456 }]);
            // id는 delete에 그대로 실려가므로 문자열로 새면 안 된다
            expect(typeof sRes.data[0].id).toBe('number');
        });

        it('name이 중복돼도 각 행의 id로 구분된다', async () => {
            mockedRpcCall.mockResolvedValue(
                ok([
                    { idx: 0, id: 10, name: 'dup', notBefore: 1, notAfter: 2 },
                    { idx: 1, id: 11, name: 'dup', notBefore: 3, notAfter: 4 },
                ])
            );

            const sRes = await getKeyList();

            expect(sRes.data.map((aKey) => aKey.id)).toEqual([10, 11]);
            expect(sRes.data.map((aKey) => aKey.name)).toEqual(['dup', 'dup']);
        });

        it('서버가 idx를 생략하면 배열 인덱스로 채운다', async () => {
            mockedRpcCall.mockResolvedValue(ok([{ id: 7, name: 'client-b', notBefore: 1, notAfter: 2 }]));

            const sRes = await getKeyList();

            expect(sRes.data[0].idx).toBe(0);
        });
    });

    describe('delKey → key.delete', () => {
        it('이름이 아니라 숫자 관리 id를 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));

            await delKey(10);

            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.key.delete, [10]);
        });
    });
});
