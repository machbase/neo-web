// issue #1570 F-146 — deleting one of several subscribers moves the tab to the last remaining
// one; the tab title must name that subscriber, not the deleted one.
import { renderHook, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveSubr, gBoardList, gBridgeList, gDelSubr } from './recoil';

const BRIDGE = { name: 'mq', type: 'mqtt', path: '' };
const SUBRS = [
    { id: 1, name: 'subr-a' },
    { id: 2, name: 'subr-b' },
    { id: 3, name: 'subr-c' },
];

const setup = (aChilds: any[]) =>
    renderHook(
        () => ({ del: useSetRecoilState(gDelSubr), boards: useRecoilValue<any[]>(gBoardList), active: useRecoilValue(gActiveSubr) }),
        {
            wrapper: ({ children }) => (
                <RecoilRoot
                    initializeState={({ set }) => {
                        set(gBridgeList, [{ ...BRIDGE, childs: aChilds }] as any);
                        set(gBoardList, [{ id: 't', type: 'subscriber', name: `SUBR: ${aChilds[0].name}`, code: { bridge: BRIDGE, subr: aChilds[0] }, savedCode: false, path: '' }] as any);
                    }}
                >
                    {children}
                </RecoilRoot>
            ),
        }
    );

test('the tab title and body name the same remaining subscriber', () => {
    const { result } = setup(SUBRS);
    act(() => result.current.del({ bridge: BRIDGE, subr: SUBRS[0] }));

    const sBoard = result.current.boards[0];
    expect(sBoard.code.subr.name).toBe('subr-c');
    expect(sBoard.name).toBe('SUBR: subr-c');
    expect(result.current.active).toBe(3);
});

test('deleting the last subscriber still opens the create form', () => {
    const { result } = setup([SUBRS[0]]);
    act(() => result.current.del({ bridge: BRIDGE, subr: SUBRS[0] }));

    expect(result.current.boards[0].name).toBe('SUBR: create');
});
