export const getCommandState = (aCommand: string) => {
    const sTmpTxt = aCommand.trim().toUpperCase();
    const sTargetTxt = sTmpTxt.slice(0, 7);
    if (sTargetTxt === 'SELECT ' || sTargetTxt === 'SELECT') return 'query';
    else return 'exec';
};
