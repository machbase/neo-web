// A command is sent as a query (rows come back) when its first word is SELECT, or WITH
// whose main statement is not a write. Any whitespace — space, tab, newline — ends the
// word (issue #1570 F-143: a SELECT split over lines or followed by a tab went out as exec).
export const getCommandState = (aCommand: string) => {
    const sText = aCommand.trim();
    const sFirstWord = (sText.match(/^[A-Za-z]+/)?.[0] ?? '').toUpperCase();
    if (sFirstWord === 'SELECT') return 'query';
    if (sFirstWord === 'WITH' && !/\)\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sText)) return 'query';
    return 'exec';
};
