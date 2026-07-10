function hasQualifiedTableName(tableName: string): boolean {
    return tableName.split('.').length > 1;
}

export function addAdminSchemaIfNeeded(
    sourceTableName: string,
    adminSchemaName: string,
): string {
    if (hasQualifiedTableName(sourceTableName)) {
        return sourceTableName;
    }

    return `${adminSchemaName.toUpperCase()}.${sourceTableName}`;
}
