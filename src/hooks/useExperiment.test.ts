import { renderHook } from '@testing-library/react';
import { EXPERIMENT_CHANGE_EVENT, isExperimentOn, storeExperiment, useExperiment } from './useExperiment';

afterEach(() => localStorage.clear());

test('the flag is read outside React too, and only true is on', () => {
    expect(isExperimentOn()).toBe(false);
    localStorage.setItem('experimentMode', 'true');
    expect(isExperimentOn()).toBe(true);
    localStorage.setItem('experimentMode', '"yes"');
    expect(isExperimentOn()).toBe(false);
    localStorage.setItem('experimentMode', '{');
    expect(isExperimentOn()).toBe(false);
});

test('setting or removing the flag says so when it turns on or off, not when it stays', () => {
    const sHeard = jest.fn();
    window.addEventListener(EXPERIMENT_CHANGE_EVENT, sHeard);
    const { result } = renderHook(() => useExperiment());
    result.current.setExperiment(true);
    result.current.setExperiment(true);
    expect(sHeard).toHaveBeenCalledTimes(1);
    result.current.setExperiment(false);
    result.current.rmExperiment();
    expect(sHeard).toHaveBeenCalledTimes(2);
    result.current.setExperiment(true);
    result.current.rmExperiment();
    expect(sHeard).toHaveBeenCalledTimes(4);
    window.removeEventListener(EXPERIMENT_CHANGE_EVENT, sHeard);
});

// issue #1584: the App Store stores what /web/api/check answers outside React. It must
// write the flag exactly as the hook does and fire the same change event, or the theme
// and the catalog would disagree about the mode.
test('the flag stored outside React is the one the hook stores, and says so the same way', () => {
    const sHeard = jest.fn();
    window.addEventListener(EXPERIMENT_CHANGE_EVENT, sHeard);
    const { result } = renderHook(() => useExperiment());
    storeExperiment(true);
    expect(localStorage.getItem('experimentMode')).toBe('true');
    expect(isExperimentOn()).toBe(true);
    expect(result.current.getExperiment()).toBe(true);
    expect(sHeard).toHaveBeenCalledTimes(1);
    result.current.setExperiment(true); // same value through the hook: no second event
    storeExperiment(true);
    expect(sHeard).toHaveBeenCalledTimes(1);
    storeExperiment(false);
    expect(localStorage.getItem('experimentMode')).toBe('false');
    expect(sHeard).toHaveBeenCalledTimes(2);
    result.current.setExperiment(true);
    storeExperiment(false);
    expect(sHeard).toHaveBeenCalledTimes(4);
    window.removeEventListener(EXPERIMENT_CHANGE_EVENT, sHeard);
});
