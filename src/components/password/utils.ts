export const checkPwdPolicy = (aNew: string, aConf: string) => {
    if (aNew.toUpperCase() !== aConf.toUpperCase()) return 'Please Check The Confirm Password.';
    if (aNew.length > 256) return 'Password can be up to 256 characters long.';
    if (aNew.includes(';')) return 'Password cannot contain ";".';
    return undefined;
};

export const parsePwd = (aPwd: string) => {
    return aPwd.replaceAll('\\', '\\\\').replaceAll("'", `\\'`);
};
