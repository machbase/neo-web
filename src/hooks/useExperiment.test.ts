import { renderHook } from '@testing-library/react';
import { EXPERIMENT_CHANGE_EVENT, isExperimentOn, useExperiment } from './useExperiment';

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
