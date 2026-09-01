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

describe('timer.ts — UI-API(JSON-RPC) named wrappers + REST 봉투 adapter', () => {
    beforeEach(() => {
        mockedRpcCall.mockReset();
    });

    describe('getTimer → schedule.list', () => {
        it('schedule.list를 빈 params로 호출하고 type=timer만 남긴다', async () => {
            mockedRpcCall.mockResolvedValue(
                ok([
                    { name: 'timer-a', type: 'TIMER', schedule: '@every 1m', task: '/a.tql', state: 'RUNNING', autoStart: true },
                    { name: 'subr-a', type: 'SUBSCRIBER', bridge: 'br', topic: 't' },
                ])
            );
            const res = await getTimer();
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.schedule.list, []);
            expect(res.data).toEqual([{ name: 'timer-a', schedule: '@every 1m', state: 'RUNNING', task: '/a.tql', type: 'TIMER', autoStart: true }]);
        });
    });

    describe('getTimerItem → schedule.get', () => {
        it('name을 위치 인자 하나로 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok({ name: 'timer-a', type: 'TIMER' }));
            await getTimerItem('timer-a');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.schedule.get, ['timer-a']);
        });

        it('REST 봉투({success, reason, elapse, data})로 감싸 반환한다', async () => {
            mockedRpcCall.mockResolvedValue(
                ok({ name: 'timer-a', type: 'TIMER', schedule: '@every 1m', task: '/a.tql', state: 'STOP', autoStart: true })
            );
            const res = await getTimerItem('timer-a');
            expect(res).toEqual({
                success: true,
                reason: 'success',
                elapse: '',
                data: { name: 'timer-a', schedule: '@every 1m', state: 'STOP', task: '/a.tql', type: 'TIMER', autoStart: true },
            });
        });

        it('omitempty로 빠진 필드(autoStart:false / 빈 schedule·task)를 기본값으로 채운다', async () => {
            // 백엔드 scheduler.Schedule은 모든 필드가 omitempty라 false/'' 는 키 자체가 사라진다
            mockedRpcCall.mockResolvedValue(ok({ name: 'timer-a', type: 'TIMER', state: 'STOP' }));
            const res = await getTimerItem('timer-a');
            expect(res.data).toEqual({ name: 'timer-a', schedule: '', state: 'STOP', task: '', type: 'TIMER', autoStart: false });
        });

        it('RPC 에러는 reason/statusText/data.reason을 모두 채운 실패 봉투가 된다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, "schedule 'timer-a' is not found"));
            const res: any = await getTimerItem('timer-a');
            expect(res.success).toBe(false);
            expect(res.reason).toBe("schedule 'timer-a' is not found");
            expect(res.statusText).toBe("schedule 'timer-a' is not found");
            expect(res.data.reason).toBe("schedule 'timer-a' is not found");
        });

        it('transport 예외도 실패 봉투로 흡수한다', async () => {
            mockedRpcCall.mockRejectedValue(new Error('network down'));
            const res = await getTimerItem('timer-a');
            expect(res.success).toBe(false);
            expect(res.reason).toBe('network down');
        });
    });

    describe('genTimer → schedule.timer.add', () => {
        it('구조체 payload 하나를 params로 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await genTimer({ autoStart: true, schedule: '@every 1m', path: '/a.tql' }, 'timer-a');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.schedule.timer.add, [
                { name: 'timer-a', spec: '@every 1m', command: '/a.tql', autoStart: true },
            ]);
        });
    });

    describe('modTimer → schedule.update', () => {
        it('add와 동일한 구조체 payload({name, spec, command, autoStart}) 하나를 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await modTimer({ autoStart: false, schedule: '@every 5m', path: '/b.tql' }, 'timer-a');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.schedule.update, [
                { name: 'timer-a', spec: '@every 5m', command: '/b.tql', autoStart: false },
            ]);
        });

        it('성공 시 success 봉투를 반환한다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            const res = await modTimer({ autoStart: true, schedule: '@every 5m', path: '/b.tql' }, 'timer-a');
            expect(res).toEqual({ success: true, reason: 'success', elapse: '' });
        });

        it('RPC 에러 메시지를 reason으로 그대로 노출한다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, 'invalid schedule expression'));
            const res = await modTimer({ autoStart: true, schedule: 'nope', path: '/b.tql' }, 'timer-a');
            expect(res.success).toBe(false);
            expect(res.reason).toBe('invalid schedule expression');
        });
    });

    describe('sendTimerCommand → schedule.start / schedule.stop', () => {
        it('stop 커맨드는 schedule.stop으로 간다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await sendTimerCommand('stop', 'timer-a');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.schedule.stop, ['timer-a']);
        });

        it('start 커맨드는 schedule.start로 간다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await sendTimerCommand('start', 'timer-a');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.schedule.start, ['timer-a']);
        });
    });

    describe('delTimer → schedule.delete', () => {
        it('name을 위치 인자 하나로 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await delTimer('timer-a');
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.schedule.delete, ['timer-a']);
        });
    });
});
