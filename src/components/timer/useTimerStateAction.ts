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

export const useTimerStateAction = () => {
    const setTimerList = useSetRecoilState<TimerItemType[] | undefined>(gTimerList);
    const setBoardList = useSetRecoilState<any[]>(gBoardList);

    const toggleTimerState = useCallback(
        async (timer: TimerItemType): Promise<ToggleTimerStateResult> => {
            const nextCommand = isTimerRunningState(timer.state) ? 'stop' : 'start';
            const commandResponse = await sendTimerCommand(nextCommand, timer.name);

            if (!commandResponse?.success) {
                return { success: false, reason: getReason(commandResponse) };
            }

            const timerInfoResponse: any = await getTimerItem(timer.name);
            if (!timerInfoResponse?.success) {
                return { success: false, reason: getReason(timerInfoResponse) };
            }

            const updatedTimer = timerInfoResponse.data;

            setTimerList((currentTimerList) => {
                if (!currentTimerList) return currentTimerList;
                return currentTimerList.map((currentTimer) => {
                    if (currentTimer.name === timer.name) {
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

                    const boardTimerName = board.code?.name ?? board.savedCode?.name;
                    if (boardTimerName !== timer.name) {
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
