import { atom } from 'recoil';

export const gEditorRef = atom<HTMLDivElement | null>({
    key: 'EditorRef',
    default: null,
})