// Links that come from outside data (e.g. a package catalog) are opened only when
// they are plain http(s) addresses, and the new window is cut off from this one so
// it cannot reach back through window.opener.
export const isHttpUrl = (aUrl: unknown): aUrl is string => {
    if (typeof aUrl !== 'string') return false;
    try {
        const sProtocol = new URL(aUrl.trim()).protocol;
        return sProtocol === 'http:' || sProtocol === 'https:';
    } catch {
        return false;
    }
};

export const openExternalUrl = (aUrl: unknown): boolean => {
    if (!isHttpUrl(aUrl)) return false;
    window.open(aUrl.trim(), '_blank', 'noopener,noreferrer');
    return true;
};
