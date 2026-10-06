export const isValidTimeZone = (aZone: string) => {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: aZone });
        return true;
    } catch {
        return false;
    }
};
