import { useLocalStorage } from './useLocalStorage';

const LOCAL_STORAGE_EXPERIMENT_KEY = 'experimentMode';

export const useExperiment = () => {
    const { getLocalItem, setLocalItem, removeLocalItem } = useLocalStorage();

    const getExperiment = (): boolean => {
        return getLocalItem(LOCAL_STORAGE_EXPERIMENT_KEY, false) ?? false;
    };
    const setExperiment = <T>(value: T) => {
        return setLocalItem(LOCAL_STORAGE_EXPERIMENT_KEY, value);
    };
    const rmExperiment = () => {
        return removeLocalItem(LOCAL_STORAGE_EXPERIMENT_KEY);
    };

    return {
        getExperiment,
        setExperiment,
        rmExperiment,
    };
};
