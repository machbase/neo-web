export type LegacyYn = 'Y' | 'N';

/**
 * Converts a legacy Y/N flag into the boolean form used inside TagAnalyzer.
 * @param aValue The legacy Y/N value from a flat or external payload.
 * @returns The normalized boolean value.
 */
export function fromLegacyYn(aValue: LegacyYn | undefined): boolean {
    return aValue === 'Y';
}

/**
 * Converts an internal boolean flag back into the legacy Y/N representation.
 * @param aValue The internal boolean value.
 * @returns The legacy Y/N value.
 */
export function toLegacyYn(aValue: boolean): LegacyYn {
    return aValue ? 'Y' : 'N';
}
