/** `"/opt/neo/machbase-neo" shell -v ...` → `machbase-neo shell -v ...`: the binary's directory is noise here. */
export const shortenShellCommand = (aCommand: unknown) => {
    const sCommand = String(aCommand ?? '').trim();
    const sMatch = sCommand.match(/^("([^"]*)"|'([^']*)'|(\S+))(.*)$/s);
    if (!sMatch) return sCommand;
    const sBinary = sMatch[2] ?? sMatch[3] ?? sMatch[4] ?? '';
    return (sBinary.split(/[\\/]/).pop() ?? sBinary) + sMatch[5];
};

/** Built-in shells come from the server config and can only be cloned; one a user made can be edited or removed. */
export const isCustomShell = (aShell: any) =>
    Array.isArray(aShell?.attributes) && aShell.attributes.some((aAttr: any) => aAttr?.editable || aAttr?.removable);
