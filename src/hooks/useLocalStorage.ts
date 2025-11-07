export const useLocalStorage = () => {
    const getItem = <T = string>(key: string, defaultValue?: T): T | null => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue ?? null;
        } catch {
            return defaultValue ?? null;
        }
    };

    const setItem = <T = unknown>(key: string, value: T): void => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Failed to set localStorage item "${key}":`, error);
        }
    };

    const removeItem = (key: string): void => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(`Failed to remove localStorage item "${key}":`, error);
        }
    };

    return { getLocalItem: getItem, setLocalItem: setItem, removeLocalItem: removeItem };
};
