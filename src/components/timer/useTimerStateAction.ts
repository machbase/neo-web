import { getTimerItem, sendTimerCommand, TimerItemType } from '@/api/repository/timer';
import { gBoardList, gTimerList } from '@/recoil/recoil';
import { useCallback } from 'react';
import { useSetRecoilState } from 'recoil';

export interface ToggleTimerStateResult {
    success: boolean;
    updatedTimer?: TimerItemType;
    reason?: string;
}

const getReason = (response: any) => {
    return response?.data?.reason || response?.reason || response?.statusText || 'Cannot connect to server';
};

export const isTimerRunningState = (state?: string) => {
    const normalizedState = state?.toUpperCase() ?? '';
    return normalizedState.includes('RUNNING') || normalizedState.includes('STARTING');
};

/**
 * A timer that stops on a failed task comes back with the failure appended to its state
 * (`STOP, MACHCLI-ERR-2025, Table … does not exist.`). Splits that structure — the state word
 * before the first `, ` and the failure after it — without reading what the failure says.
 * `error` is empty when nothing is attached, i.e. the timer did not stop on a failure.
 */
export const splitTimerState = (state?: string): { word: string; error: string } => {
    const sState = state ?? '';
    const sAt = sState.indexOf(', ');
    if (sAt < 0) return { word: sState.trim(), error: '' };
    return { word: sState.slice(0, sAt).trim(), error: sState.slice(sAt + 2).trim() };
};

export const useTimerStateAction = () => {
    const setTimerList = useSetRecoilState<TimerItemType[] | undefined>(gTimerList);
    const setBoardList = useSetRecoilState<any[]>(gBoardList);

    const toggleTimerState = useCallback(
        async (timer: TimerItemType): Promise<ToggleTimerStateResult> => {
            const nextCommand = isTimerRunningState(timer.state) ? 'stop' : 'start';
            const commandResponse = await sendTimerCommand(nextCommand, timer.id);

            if (!commandResponse?.success) {
                return { success: false, reason: getReason(commandResponse) };
            }

            const timerInfoResponse = await getTimerItem(timer.id);
            if (!timerInfoResponse?.success) {
                return { success: false, reason: getReason(timerInfoResponse) };
            }

            const updatedTimer = timerInfoResponse.data;

            setTimerList((currentTimerList) => {
                if (!currentTimerList) return currentTimerList;
                return currentTimerList.map((currentTimer) => {
                    if (currentTimer.id === timer.id) {
                        return updatedTimer;
                    }
                    return currentTimer;
                });
            });

            setBoardList((currentBoardList) => {
                return currentBoardList.map((board) => {
                    if (board.type !== 'timer') {
                        return board;
                    }

                    const boardTimerId = board.code?.id ?? board.savedCode?.id;
                    if (boardTimerId !== timer.id) {
                        return board;
                    }

                    const nextCode = board.code && typeof board.code === 'object' ? { ...board.code, state: updatedTimer.state } : updatedTimer;
                    const nextSavedCode = updatedTimer;

                    return {
                        ...board,
                        name: `TIMER: ${updatedTimer.name}`,
                        code: nextCode,
                        savedCode: nextSavedCode,
                    };
                });
            });

            return {
                success: true,
                updatedTimer,
            };
        },
        [setBoardList, setTimerList]
    );

    return { toggleTimerState };
};
