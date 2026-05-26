import { getUserName, isCurUserEqualAdmin } from '@/utils';

export function hasQualifiedTableName(tableName: string): boolean {
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

export function addCurrentUserSchemaIfNeeded(tableName: string): string {
    const sCurrentUserName = getUserName();

    if (isCurUserEqualAdmin() || hasQualifiedTableName(tableName)) {
        return tableName;
    }

    return `${sCurrentUserName}.${tableName}`;
}
