import { resolvePanelRangeCandidate } from '../panel/panelRangeResolution';
import {
    createPanelRangeButtonCandidate,
    type PanelRangeButtonAction,
} from './panelRangeCommands';
import type { PanelRangeState } from './rangeModel';

const RANGE: PanelRangeState = {
    panelRange: { startTime: 100, endTime: 200 },
    navigatorRange: { startTime: 0, endTime: 300 },
};

function applyButton(action: PanelRangeButtonAction): PanelRangeState {
    return resolvePanelRangeCandidate(
        RANGE,
        createPanelRangeButtonCandidate(RANGE, action),
    );
}

const MAIN_BUTTON_CASES = [
    ['shift-main-left', { startTime: 70, endTime: 170 }],
    ['shift-main-right', { startTime: 130, endTime: 230 }],
    ['zoom-in-small', { startTime: 120, endTime: 180 }],
    ['zoom-in-large', { startTime: 140, endTime: 160 }],
    ['zoom-out-small', { startTime: 80, endTime: 220 }],
    ['zoom-out-large', { startTime: 60, endTime: 240 }],
] satisfies Array<[PanelRangeButtonAction, PanelRangeState['panelRange']]>;

test.each(MAIN_BUTTON_CASES)(
    '%s produces the expected Main range',
    (action, panelRange) => {
        expect(applyButton(action)).toEqual({
            panelRange,
            navigatorRange: RANGE.navigatorRange,
        });
    },
);

const NAVIGATOR_BUTTON_CASES = [
    ['shift-navigator-left', { startTime: -30, endTime: 270 }],
    ['shift-navigator-right', { startTime: 30, endTime: 330 }],
] satisfies Array<[PanelRangeButtonAction, PanelRangeState['navigatorRange']]>;

test.each(NAVIGATOR_BUTTON_CASES)(
    '%s produces the expected Navigator range',
    (action, navigatorRange) => {
        expect(applyButton(action)).toEqual({
            panelRange: RANGE.panelRange,
            navigatorRange,
        });
    },
);

test('Focus makes the previous Main the Navigator and centers a 20% Main', () => {
    expect(applyButton('focus')).toEqual({
        panelRange: { startTime: 140, endTime: 160 },
        navigatorRange: RANGE.panelRange,
    });
});
