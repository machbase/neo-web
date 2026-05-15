export const parseEditorNumber = (value: string): number | '' => {
    return value === '' ? '' : Number(value);
};

