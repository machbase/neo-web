import { useLocalStorage } from './useLocalStorage';

export const LOCAL_STORAGE_EXPERIMENT_KEY = 'experimentMode';
/** Fired on window when the experiment flag turns on or off (not when it is set to what it was). */
export const EXPERIMENT_CHANGE_EVENT = 'neo-experiment-change';

/** The experiment flag the server last gave (sign-in, login check), outside React too: the theme reads it before the first render. */
export const isExperimentOn = (): boolean => {
    try {
        const sItem = localStorage.getItem(LOCAL_STORAGE_EXPERIMENT_KEY);
        return sItem ? JSON.parse(sItem) === true : false;
    } catch {
        return false;
    }
};

const notifyIfChanged = (aBefore: boolean) => {
    if (isExperimentOn() !== aBefore) window.dispatchEvent(new Event(EXPERIMENT_CHANGE_EVENT));
};

export const useExperiment = () => {
    const { getLocalItem, setLocalItem, removeLocalItem } = useLocalStorage();

    const getExperiment = (): boolean => {
        return getLocalItem(LOCAL_STORAGE_EXPERIMENT_KEY, false) ?? false;
    };
    const setExperiment = <T>(value: T) => {
        const sBefore = isExperimentOn();
        setLocalItem(LOCAL_STORAGE_EXPERIMENT_KEY, value);
        notifyIfChanged(sBefore);
    };
    const rmExperiment = () => {
        const sBefore = isExperimentOn();
        removeLocalItem(LOCAL_STORAGE_EXPERIMENT_KEY);
        notifyIfChanged(sBefore);
    };

    return {
        getExperiment,
        setExperiment,
        rmExperiment,
    };
};
