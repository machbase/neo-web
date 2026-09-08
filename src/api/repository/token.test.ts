import { getApiTokens, genApiToken, delApiToken } from './token';
import { rpcCall, RpcMethod } from './rpc';

// token.ts는 저수준 `rpcCall`만 호출하므로 그것만 모킹하고, RpcMethod 등 나머지는
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

const ROW = {
    id: 5,
    name: 'form-probe',
    user: 'SYS',
    hint: 'nt_5_OKq9****nckI',
    createdAt: 1788318822,
    notAfter: 2103938022,
};

describe('token.ts — API token RPC wrapper (server PR #469)', () => {
    beforeEach(() => {
        mockedRpcCall.mockReset();
    });

    describe('getApiTokens → token.list', () => {
        it('token.list를 빈 params로 호출한다', async () => {
            mockedRpcCall.mockResolvedValue(ok([]));
            await getApiTokens();
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.token.list, []);
        });

        it('행을 그대로 매핑하고 id는 number로 보존한다', async () => {
            mockedRpcCall.mockResolvedValue(ok([ROW]));

            const sRes = await getApiTokens();

            expect(sRes.success).toBe(true);
            expect(sRes.data[0]).toEqual({ ...ROW, lastUsedAt: undefined });
            expect(typeof sRes.data[0].id).toBe('number');
        });

        it('lastUsedAt이 없으면 0이 아니라 undefined로 남긴다', async () => {
            // 서버가 omitempty로 필드를 통째로 빼므로 0으로 채우면 1970년이 렌더된다
            mockedRpcCall.mockResolvedValue(ok([ROW]));

            const sRes = await getApiTokens();

            expect(sRes.data[0].lastUsedAt).toBeUndefined();
        });

        it('lastUsedAt이 오면 숫자로 담는다', async () => {
            mockedRpcCall.mockResolvedValue(ok([{ ...ROW, lastUsedAt: 1788318900 }]));

            const sRes = await getApiTokens();

            expect(sRes.data[0].lastUsedAt).toBe(1788318900);
        });

        it('이름이 중복돼도 각 행의 id로 구분된다', async () => {
            mockedRpcCall.mockResolvedValue(ok([ROW, { ...ROW, id: 6 }]));

            const sRes = await getApiTokens();

            expect(sRes.data.map((aToken) => aToken.id)).toEqual([5, 6]);
            expect(sRes.data.map((aToken) => aToken.name)).toEqual(['form-probe', 'form-probe']);
        });

        it('RPC 에러는 success:false와 빈 배열로 변환한다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, 'boom'));

            const sRes = await getApiTokens();

            expect(sRes.success).toBe(false);
            expect(sRes.reason).toBe('boom');
            expect(sRes.data).toEqual([]);
        });
    });

    describe('genApiToken → token.generate', () => {
        it('[name, notAfter] 두 개만 넘긴다 (notBefore 없음)', async () => {
            mockedRpcCall.mockResolvedValue(ok({ ...ROW, token: 'nt_5_secret' }));

            await genApiToken('form-probe', 0);

            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.token.generate, ['form-probe', 0]);
        });

        it('평문 token을 결과에 싣는다', async () => {
            mockedRpcCall.mockResolvedValue(ok({ ...ROW, token: 'nt_5_OKq9GpQA' }));

            const sRes = await genApiToken('form-probe', 0);

            expect(sRes.success).toBe(true);
            expect(sRes.data?.token).toBe('nt_5_OKq9GpQA');
            expect(sRes.data?.id).toBe(5);
        });

        it('빈 이름 거부는 서버 에러 메시지를 그대로 전달한다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, 'token name is required'));

            const sRes = await genApiToken('', 0);

            expect(sRes.success).toBe(false);
            expect(sRes.reason).toBe('token name is required');
            expect(sRes.data).toBeUndefined();
        });
    });

    describe('delApiToken → token.delete', () => {
        it('이름이 아니라 숫자 관리 id를 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));

            await delApiToken(5);

            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.token.delete, [5]);
        });
    });
});
