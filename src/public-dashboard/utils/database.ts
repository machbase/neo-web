export const MountNameRegEx = /(^[a-zA-Z])[a-zA-Z0-9_]*$/;

const KEY_WORD_LIST = ['SELECT', 'MOUNT'];
export const IsKeyword = (aName?: string): boolean => {
    const sUpperName: string = aName?.toUpperCase() ?? '';
    return KEY_WORD_LIST.includes(sUpperName);
};
