const SQL_IDENTIFIER_SEGMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_$]*$/;

function assertSqlIdentifierPath(
    identifierPath: string,
    label = 'SQL identifier',
): void {
    const sSegments = identifierPath.split('.');

    if (
        sSegments.length === 0 ||
        sSegments.some((segment) => !SQL_IDENTIFIER_SEGMENT_PATTERN.test(segment))
    ) {
        throw new Error(`${label} contains unsupported characters: ${identifierPath}`);
    }
}

export function buildSqlIdentifierPath(
    identifierPath: string,
    label = 'SQL identifier',
): string {
    assertSqlIdentifierPath(identifierPath, label);
    return identifierPath;
}

export function buildSqlStringLiteral(value: string | number): string {
    return `'${String(value).replace(/'/g, "''")}'`;
}

export function buildSqlStringLiteralList(values: Array<string | number>): string {
    return values.map(buildSqlStringLiteral).join(', ');
}

export function buildTqlDoubleQuotedString(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
