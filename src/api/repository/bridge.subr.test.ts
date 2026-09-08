import { getSubr, getSubrItem, genSubr, delSubr, commandSubr } from './bridge';
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

describe('bridge.ts subscriber — UI-API(JSON-RPC) `subscriber.*` wrappers + REST 봉투 adapter', () => {
    beforeEach(() => {
        mockedRpcCall.mockReset();
    });

    describe('getSubr → subscriber.list', () => {
        it('subscriber.list를 빈 params로 호출하고 type 필터 없이 전부 매핑한다', async () => {
            mockedRpcCall.mockResolvedValue(
                ok([{ id: 3, name: 'subr-a', bridge: 'br', topic: 't/1', state: 'RUNNING', qos: 2, autoStart: true, task: '/a.tql' }])
            );
            const res = await getSubr();
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.subscriber.list, []);
            expect(res.data).toEqual([
                {
                    id: 3,
                    name: 'subr-a',
                    autoStart: true,
                    state: 'RUNNING',
                    task: '/a.tql',
                    bridge: 'br',
                    topic: 't/1',
                    type: 'SUBSCRIBER',
                    QoS: '2',
                    queue: undefined,
                    stream: undefined,
                },
            ]);
        });

        it('QoS 키가 대문자(구버전)여도 소문자(신버전)여도 읽는다', async () => {
            mockedRpcCall.mockResolvedValue(ok([{ id: 1, name: 'a', QoS: 1 }, { id: 2, name: 'b', qos: 2 }]));
            const res = await getSubr();
            expect(res.data.map((it) => it.QoS)).toEqual(['1', '2']);
        });

        it('NATS queue/stream 을 응답에서 읽어낸다(예전에는 write-only라 되읽을 수 없었다)', async () => {
            mockedRpcCall.mockResolvedValue(ok([{ id: 5, name: 'n', bridge: 'nb', topic: 's.subj', queue: 'q1', stream: 'st1' }]));
            const res = await getSubr();
            expect(res.data[0]).toMatchObject({ queue: 'q1', stream: 'st1' });
        });
    });

    describe('getSubrItem → subscriber.get', () => {
        it('id를 위치 인자 하나로 넘긴다(이름을 넘기면 서버가 -32602로 거부한다)', async () => {
            mockedRpcCall.mockResolvedValue(ok({ id: 3, name: 'subr-a' }));
            await getSubrItem(3);
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.subscriber.get, [3]);
        });

        it('REST 봉투({success, reason, elapse, data})로 감싸 반환한다 (QoS는 문자열로 정규화)', async () => {
            mockedRpcCall.mockResolvedValue(ok({ id: 3, name: 'subr-a', bridge: 'br', topic: 't/1', state: 'RUNNING', qos: 1, autoStart: true, task: '/a.tql' }));
            const res = await getSubrItem(3);
            expect(res).toEqual({
                success: true,
                reason: 'success',
                elapse: '',
                data: {
                    id: 3,
                    name: 'subr-a',
                    autoStart: true,
                    state: 'RUNNING',
                    task: '/a.tql',
                    bridge: 'br',
                    topic: 't/1',
                    type: 'SUBSCRIBER',
                    QoS: '1',
                    queue: undefined,
                    stream: undefined,
                },
            });
        });

        it('omitempty로 빠진 필드(autoStart:false / qos:0 / 빈 문자열)를 기본값으로 채운다', async () => {
            // 백엔드 subscriber.Info는 모든 필드가 omitempty라 false/0/'' 는 키 자체가 사라진다
            mockedRpcCall.mockResolvedValue(ok({ id: 3, name: 'subr-a', state: 'STOP' }));
            const res = await getSubrItem(3);
            expect(res.data).toEqual({
                id: 3,
                name: 'subr-a',
                autoStart: false,
                state: 'STOP',
                task: '',
                bridge: '',
                topic: '',
                type: 'SUBSCRIBER',
                QoS: undefined,
                queue: undefined,
                stream: undefined,
            });
        });

        it('RPC 에러는 reason/statusText/data.reason을 모두 채운 실패 봉투가 된다', async () => {
            mockedRpcCall.mockResolvedValue(fail(-32000, "subscriber id '3' not found"));
            const res: any = await getSubrItem(3);
            expect(res.success).toBe(false);
            expect(res.reason).toBe("subscriber id '3' not found");
            expect(res.statusText).toBe("subscriber id '3' not found");
            expect(res.data.reason).toBe("subscriber id '3' not found");
        });

        it('transport 예외도 실패 봉투로 흡수한다', async () => {
            mockedRpcCall.mockRejectedValue(new Error('network down'));
            const res = await getSubrItem(3);
            expect(res.success).toBe(false);
            expect(res.reason).toBe('network down');
        });
    });

    describe('genSubr → subscriber.add', () => {
        it('MQTT 브리지는 중첩 mqtt 블록으로 보낸다', async () => {
            mockedRpcCall.mockResolvedValue(ok(9));
            await genSubr({ name: 's1', bridge: 'br', task: '/a.tql', autoStart: true, bridge_type: 'mqtt', QoS: 1 });
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.subscriber.add, [
                { name: 's1', bridge: 'br', command: '/a.tql', autoStart: true, mqtt: { topic: undefined, qos: 1 } },
            ]);
        });

        it('NATS 브리지는 queue/stream 키로 보낸다 — queueName 은 서버가 조용히 버린다', async () => {
            // 이 키 이름이 어긋나면 subscriber는 생성되지만 queue 값만 사라지고 에러가 나지 않는다.
            // 이번 마이그레이션에서 유일하게 무증상으로 깨지는 지점이라 회귀 테스트로 고정한다.
            mockedRpcCall.mockResolvedValue(ok(10));
            await genSubr({ name: 's2', bridge: 'nb', task: '/a.tql', autoStart: false, bridge_type: 'nats', topic: 'a.b', queue: 'q1', stream: 'st1' });
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.subscriber.add, [
                { name: 's2', bridge: 'nb', command: '/a.tql', autoStart: false, nats: { subject: 'a.b', queue: 'q1', stream: 'st1' } },
            ]);
        });

        it('mqtt 와 nats 블록을 동시에 보내지 않는다(서버가 상호 배타로 거부한다)', async () => {
            mockedRpcCall.mockResolvedValue(ok(11));
            await genSubr({ name: 's3', bridge: 'nb', task: '/a.tql', bridge_type: 'nats', topic: 'a.b' });
            const sent = mockedRpcCall.mock.calls[0][1][0];
            expect(sent.nats).toBeDefined();
            expect(sent.mqtt).toBeUndefined();
        });

        it('생성된 id를 봉투에 담아 돌려준다', async () => {
            mockedRpcCall.mockResolvedValue(ok(9));
            const res = await genSubr({ name: 's1', bridge: 'br', task: '/a.tql', bridge_type: 'mqtt', topic: 't' });
            expect(res).toEqual({ success: true, reason: 'success', elapse: '', id: 9 });
        });
    });

    describe('delSubr / commandSubr → subscriber.delete / start / stop', () => {
        it('delSubr는 id를 위치 인자 하나로 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await delSubr(3);
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.subscriber.delete, [3]);
        });

        it('stop은 subscriber.stop, start는 subscriber.start로 id를 넘긴다', async () => {
            mockedRpcCall.mockResolvedValue(ok(null));
            await commandSubr('stop', 3);
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.subscriber.stop, [3]);
            await commandSubr('start', 3);
            expect(mockedRpcCall).toHaveBeenCalledWith(RpcMethod.subscriber.start, [3]);
        });
    });
});
