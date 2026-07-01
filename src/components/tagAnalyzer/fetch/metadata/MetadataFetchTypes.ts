export type TableListFetchResponse = {
    success?: boolean;
    status?: number;
    statusText?: string;
    data: unknown;
};

export type RawTableListData = {
    columns: unknown[];
    rows: unknown[];
};