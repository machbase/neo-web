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

/** Store the experiment flag (JSON, as useLocalStorage writes it) and say so when it turns on or off. Outside React too: the App Store's hub fetch stores what the server answers. */
export const storeExperiment = <T>(value: T) => {
    const sBefore = isExperimentOn();
    try {
        localStorage.setItem(LOCAL_STORAGE_EXPERIMENT_KEY, JSON.stringify(value));
    } catch {
        /* storage unavailable — nothing changed */
    }
    notifyIfChanged(sBefore);
};

export const useExperiment = () => {
    const { getLocalItem, removeLocalItem } = useLocalStorage();

    const getExperiment = (): boolean => {
        return getLocalItem(LOCAL_STORAGE_EXPERIMENT_KEY, false) ?? false;
    };
    const setExperiment = <T>(value: T) => storeExperiment(value);
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
