export type TransformBlockType = {
    [ke: string | number]: number | string | number[] | boolean | undefined;
    id: string;
    alias: string;
    color: string;
    value: string;
    valid: undefined | boolean;
    isVisible: boolean;
    selectedBlockIdxList: number[];
};
export type TransformBlockKeyType = keyof Omit<TransformBlockType, 'id' | 'selectedBlockIdxList'> | 'selectBlockIdx';
