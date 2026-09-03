import { getTimer, getTimerItem, genTimer, modTimer, sendTimerCommand, delTimer } from './timer';
import { rpcCall, RpcMethod } from './rpc';

// timer.ts는 저수준 `rpcCall`만 호출하므로 그것만 모킹하고, RpcMethod 등 나머지는
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

describe('timer.ts — UI-API(JSON-RPC) `timer.*` wrappers + REST 봉투 adapter', () => {
    beforeEach(() => {
        mockedRpcCall.mockReset();
    });

    it('`schedule.*` 네임스페이스는 서버에서 제거되어 레지스트리에도 없어야 한다', () => {
        expect((RpcMethod as any).schedule).toBeUndefined();
    });

    describe('getTimer → timer.list', () => {
        it('timer.list를 빈 params로 호출하고 type 필터 없이 전부 매핑한다', async () => {
            mockedRpcCall.mockResolvedValue(
                ok([{ id: 7, name: 'timer-a', schedule: '@every 1m', task: '/a.tql', state: 'RUNNING', autoStart: true, userName: 'SYS', execUser: 'sys' }])
            );
            const res = await getTimer();
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.timer.list, []);
            expect(res.data).toEqual([{ id: 7, name: 'timer-a', schedule: '@every 1m', state: 'RUNNING', task: '/a.tql', type: 'TIMER', autoStart: true }]);
        });

        it('`type` 이 사라진 timer.Info 응답에도 TIMER 상수를 채운다', async () => {
            // subscriber 와 네임스페이스가 갈라지면서 timer.Info 에는 type 판별 필드가 없다
            mockedRpcCall.mockResolvedValue(ok([{ id: 1, name: 'timer-a', state: 'STOP' }]));
            const res = await getTimer();
            expect(res.data[0].type).toBe('TIMER');
        });
    });

    describe('getTimerItem → timer.get', () => {
        it('id를 위치 인자 하나로 넘긴다(이름을 넘기면 서버가 -32602로 거부한다)', async () => {
            mockedRpcCall.mockResolvedValue(ok({ id: 7, name: 'timer-a' }));
            await getTimerItem(7);
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.timer.get, [7]);
        });

        it('REST 봉투({success, reason, elapse, data})로 감싸 반환한다', async () => {
            mockedRpcCall.mockResolvedValue(ok({ id: 7, name: 'timer-a', schedule: '@every 1m', task: '/a.tql', state: 'STOP', autoStart: true }));
            const res = await getTimerItem(7);
            expect(res).toEqual({
                success: true,
                reason: 'success',
                elapse: '',
                data: { id: 7, name: 'timer-a', schedule: '@every 1m', state: 'STOP', task: '/a.tql', type: 'TIMER', autoStart: true },
            });
        });

        it('omitempty로 빠진 필드(autoStart:false / 빈 schedule·task)를 기본값으로 채운다', async () => {
            // 백엔드 timer.Info는 모든 필드가 omitempty라 false/'' 는 키 자체가 사라진다
            mockedRpcCall.mockResolvedValue(ok({ id: 7, name: 'timer-a', state: 'STOP' }));
            const res = await getTimerItem(7);
            expect(res.data).toEqual({ id: 7, name: 'timer-a', schedule: '', state: 'STOP', task: '', type: 'TIMER', autoStart: false });
        });

        it('RPC 에러는 reason/statusText/data.reason을 모두 채운 실패 봉투가 된다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, "timer id '7' not found"));
            const res: any = await getTimerItem(7);
            expect(res.success).toBe(false);
            expect(res.reason).toBe("timer id '7' not found");
            expect(res.statusText).toBe("timer id '7' not found");
            expect(res.data.reason).toBe("timer id '7' not found");
        });

        it('transport 예외도 실패 봉투로 흡수한다', async () => {
            mockedRpcCall.mockRejectedValue(new Error('network down'));
            const res = await getTimerItem(7);
            expect(res.success).toBe(false);
            expect(res.reason).toBe('network down');
        });
    });

    describe('genTimer → timer.add', () => {
        it('구조체 payload 하나를 params로 넘긴다(schedule.timer.add 와 동일한 형태)', async () => {
            mockedRpcCall.mockResolvedValue(ok(12));
            await genTimer({ autoStart: true, schedule: '@every 1m', path: '/a.tql' }, 'timer-a');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.timer.add, [{ name: 'timer-a', spec: '@every 1m', command: '/a.tql', autoStart: true }]);
        });

        it('생성된 id를 봉투에 담아 돌려준다', async () => {
            mockedRpcCall.mockResolvedValue(ok(12));
            const res = await genTimer({ autoStart: false, schedule: '@every 1m', path: '/a.tql' }, 'timer-a');
            expect(res).toEqual({ success: true, reason: 'success', elapse: '', id: 12 });
        });

        it('중복 이름 에러를 reason으로 노출한다(이전 서버는 조용히 덮어썼다)', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, "schedule name 'TIMER-A' already exists"));
            const res = await genTimer({ autoStart: false, schedule: '@every 1m', path: '/a.tql' }, 'timer-a');
            expect(res.success).toBe(false);
            expect(res.reason).toBe("schedule name 'TIMER-A' already exists");
        });
    });

    describe('modTimer → timer.update', () => {
        it('name이 아니라 id로 대상을 지정하고, 나머지 필드를 항상 전부 보낸다', async () => {
            // 백엔드가 merge가 아니라 replace라 생략한 필드는 서버에서 초기화된다
            mockedRpcCall.mockResolvedValue(ok(null));
            await modTimer({ autoStart: false, schedule: '@every 5m', path: '/b.tql' }, 7);
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.timer.update, [{ id: 7, spec: '@every 5m', command: '/b.tql', autoStart: false }]);
        });

        it('성공 시 success 봉투를 반환한다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            const res = await modTimer({ autoStart: true, schedule: '@every 5m', path: '/b.tql' }, 7);
            expect(res).toEqual({ success: true, reason: 'success', elapse: '' });
        });

        it('RPC 에러 메시지를 reason으로 그대로 노출한다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, 'invalid schedule expression'));
            const res = await modTimer({ autoStart: true, schedule: 'nope', path: '/b.tql' }, 7);
            expect(res.success).toBe(false);
            expect(res.reason).toBe('invalid schedule expression');
        });
    });

    describe('sendTimerCommand → timer.start / timer.stop', () => {
        it('stop 커맨드는 timer.stop으로 id를 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await sendTimerCommand('stop', 7);
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.timer.stop, [7]);
        });

        it('start 커맨드는 timer.start로 id를 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await sendTimerCommand('start', 7);
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.timer.start, [7]);
        });
    });

    describe('delTimer → timer.delete', () => {
        it('id를 위치 인자 하나로 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await delTimer(7);
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.timer.delete, [7]);
        });
    });
});
