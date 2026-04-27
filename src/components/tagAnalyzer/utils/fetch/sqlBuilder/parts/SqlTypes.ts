export type RollupValue = number | string;

export type RollupTableEntry = {
    VALUE?: RollupValue[] | undefined;
    EXT_TYPE?: RollupValue[] | undefined;
};

export type ParsedRollupTableName = {
    databaseName: string;
    userName: string;
    tableName: string;
};

export type RollupMetadataLookupKey = {
    userName: string;
    tableName: string;
};
