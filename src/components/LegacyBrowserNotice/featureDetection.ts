export const needsLegacyBrowserNotice = (): boolean => {
    try {
        if (typeof structuredClone === 'undefined') return true;
        if (typeof Array.prototype.at !== 'function') return true;
        return false;
    } catch {
        return false;
    }
};
