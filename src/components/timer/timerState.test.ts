// issue #768 — a timer that stops on a failed task comes back with the failure appended to its
// state (`STOP, <failure>`). The badge shows the state word only and the failure decides whether
// the last error stopped the timer; both come from splitTimerState, which splits the structure and
// never reads the failure text.

import { splitTimerState } from './useTimerStateAction';

test('a plain state is the word with nothing attached', () => {
    expect(splitTimerState('RUNNING')).toEqual({ word: 'RUNNING', error: '' });
    expect(splitTimerState('STOP')).toEqual({ word: 'STOP', error: '' });
});

test('a failure after the first ", " is split off whole', () => {
    expect(splitTimerState('STOP, MACHCLI-ERR-2025, Table SENSOR_DATA does not exist.')).toEqual({
        word: 'STOP',
        error: 'MACHCLI-ERR-2025, Table SENSOR_DATA does not exist.',
    });
});

test('a multi-line failure keeps its lines', () => {
    expect(splitTimerState('STOP, line one\nline two')).toEqual({ word: 'STOP', error: 'line one\nline two' });
});

test('an empty or missing state is empty', () => {
    expect(splitTimerState('')).toEqual({ word: '', error: '' });
    expect(splitTimerState(undefined)).toEqual({ word: '', error: '' });
});
