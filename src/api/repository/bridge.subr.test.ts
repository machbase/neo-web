import { getSubr, getSubrItem } from './bridge';
import { rpcCall, RpcMethod } from './rpc';

// bridge.ts의 subscriber 경로는 저수준 `rpcCall`만 호출하므로 그것만 모킹하고,
// RpcMethod 등 나머지는 실제 구현을 사용한다(메서드 이름 회귀까지 검증하기 위함).
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

describe('bridge.ts subscriber — UI-API(JSON-RPC) named wrappers + REST 봉투 adapter', () => {
    beforeEach(() => {
        mockedRpcCall.mockReset();
    });

    describe('getSubr → schedule.list', () => {
        it('type=subscriber만 남기고 공용 매퍼로 정규화한다', async () => {
            mockedRpcCall.mockResolvedValue(
                ok([
                    { name: 'subr-a', type: 'SUBSCRIBER', bridge: 'br', topic: 't/1', state: 'RUNNING', QoS: 2, autoStart: true, task: '/a.tql' },
                    { name: 'timer-a', type: 'TIMER', schedule: '@every 1m' },
                ])
            );
            const res = await getSubr();
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.schedule.list, []);
            expect(res.data).toEqual([
                { name: 'subr-a', autoStart: true, state: 'RUNNING', task: '/a.tql', bridge: 'br', topic: 't/1', type: 'SUBSCRIBER', QoS: '2', queue: undefined },
            ]);
        });
    });

    describe('getSubrItem → schedule.get', () => {
        it('name을 위치 인자 하나로 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok({ name: 'subr-a', type: 'SUBSCRIBER' }));
            await getSubrItem('subr-a');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.schedule.get, ['subr-a']);
        });

        it('REST 봉투({success, reason, elapse, data})로 감싸 반환한다 (QoS는 문자열로 정규화)', async () => {
            mockedRpcCall.mockResolvedValue(
                ok({ name: 'subr-a', type: 'SUBSCRIBER', bridge: 'br', topic: 't/1', state: 'RUNNING', QoS: 1, autoStart: true, task: '/a.tql' })
            );
            const res = await getSubrItem('subr-a');
            expect(res).toEqual({
                success: true,
                reason: 'success',
                elapse: '',
                data: { name: 'subr-a', autoStart: true, state: 'RUNNING', task: '/a.tql', bridge: 'br', topic: 't/1', type: 'SUBSCRIBER', QoS: '1', queue: undefined },
            });
        });

        it('omitempty로 빠진 필드(autoStart:false / QoS:0 / 빈 문자열)를 기본값으로 채운다', async () => {
            // 백엔드 scheduler.Schedule은 모든 필드가 omitempty라 false/0/'' 는 키 자체가 사라진다
            mockedRpcCall.mockResolvedValue(ok({ name: 'subr-a', type: 'SUBSCRIBER', state: 'STOP' }));
            const res = await getSubrItem('subr-a');
            expect(res.data).toEqual({
                name: 'subr-a',
                autoStart: false,
                state: 'STOP',
                task: '',
                bridge: '',
                topic: '',
                type: 'SUBSCRIBER',
                QoS: undefined,
                queue: undefined,
            });
        });

        it('RPC 에러는 reason/statusText/data.reason을 모두 채운 실패 봉투가 된다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, "schedule 'subr-a' is not found"));
            const res: any = await getSubrItem('subr-a');
            expect(res.success).toBe(false);
            expect(res.reason).toBe("schedule 'subr-a' is not found");
            expect(res.statusText).toBe("schedule 'subr-a' is not found");
            expect(res.data.reason).toBe("schedule 'subr-a' is not found");
        });

        it('transport 예외도 실패 봉투로 흡수한다', async () => {
            mockedRpcCall.mockRejectedValue(new Error('network down'));
            const res = await getSubrItem('subr-a');
            expect(res.success).toBe(false);
            expect(res.reason).toBe('network down');
        });
    });
});
