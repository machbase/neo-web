export const parseEditorNumber = (value: string): number | undefined => {
    return value === '' ? undefined : Number(value);
};

