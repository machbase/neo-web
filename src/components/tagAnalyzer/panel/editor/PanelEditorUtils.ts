import type { EditorNumberInputValue } from './EditorTypes';

export const parseEditorNumber = (value: string): EditorNumberInputValue => {
    return value === '' ? '' : Number(value);
};

