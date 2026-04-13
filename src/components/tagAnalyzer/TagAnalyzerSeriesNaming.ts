// Used by TagAnalyzerSeriesNaming to type source tag name carrier.
type SourceTagNameCarrier = {
    sourceTagName: string | undefined;
    tagName: string | undefined;
};

type SourceTagNameInput =
    | Pick<SourceTagNameCarrier, 'sourceTagName'>
    | Pick<SourceTagNameCarrier, 'tagName'>
    | SourceTagNameCarrier;

type NormalizedSourceTagName<T extends SourceTagNameInput> = T extends {
    tagName: string | undefined;
}
    ? Omit<T, 'tagName'> & { sourceTagName: string }
    : T & { sourceTagName: string };

/**
 * Resolves the canonical source-series identifier while still accepting legacy tagName payloads.
 * @param aItem The draft or saved series config carrying a source tag name.
 * @returns The normalized source tag name.
 */
export function getSourceTagName(aItem: SourceTagNameInput): string {
    if ('sourceTagName' in aItem && aItem.sourceTagName) {
        return aItem.sourceTagName;
    }

    if ('tagName' in aItem && aItem.tagName) {
        return aItem.tagName;
    }

    return '';
}

/**
 * Normalizes one draft or series config to the sourceTagName-only internal shape.
 * @param aItem The item to normalize.
 * @returns The normalized item with a required sourceTagName and no legacy tagName field.
 */
export function withNormalizedSourceTagName<T extends SourceTagNameInput>(
    aItem: T,
): NormalizedSourceTagName<T> {
    const sSourceTagName = getSourceTagName(aItem);
    const sItem = aItem as T & SourceTagNameCarrier;
    const { tagName: _legacyTagName, sourceTagName: _sourceTagName, ...sRest } = sItem;

    return {
        ...sRest,
        sourceTagName: sSourceTagName,
    } as NormalizedSourceTagName<T>;
}

/**
 * Normalizes a list of drafts or series configs to the sourceTagName-only internal shape.
 * @param aItems The items to normalize.
 * @returns The normalized items with required sourceTagName values.
 */
export function normalizeSourceTagNames<T extends SourceTagNameInput>(
    aItems: T[],
): Array<NormalizedSourceTagName<T>> {
    return aItems.map((aItem) => withNormalizedSourceTagName(aItem));
}

/**
 * Recreates the legacy tagName field only when calling shared utilities outside TagAnalyzer.
 * @param aItem The TagAnalyzer item to translate for a legacy utility boundary.
 * @returns The translated item with both sourceTagName and tagName populated.
 */
export function toLegacyTagNameItem<T extends { sourceTagName: string | undefined }>(
    aItem: T,
): T & { tagName: string } {
    return {
        ...aItem,
        tagName: getSourceTagName(aItem),
    };
}

/**
 * Recreates legacy tagName fields for a list of items at a legacy utility boundary.
 * @param aItems The TagAnalyzer items to translate.
 * @returns The translated items with legacy tagName values restored.
 */
export function toLegacyTagNameList<T extends { sourceTagName: string | undefined }>(
    aItems: T[],
): Array<T & { tagName: string }> {
    return aItems.map((aItem) => toLegacyTagNameItem(aItem));
}
