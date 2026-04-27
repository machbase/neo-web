type SourceTagNameCarrier = {
    sourceTagName: string | undefined;
    tagName: string | undefined;
};

export type SourceTagNameInput =
    | Pick<SourceTagNameCarrier, 'sourceTagName'>
    | Pick<SourceTagNameCarrier, 'tagName'>
    | Partial<SourceTagNameCarrier>;

export type NormalizedSourceTagName<T extends SourceTagNameInput> = Omit<
    T,
    'tagName' | 'sourceTagName'
> & {
    sourceTagName: string;
};

export function getSourceTagName(item: SourceTagNameInput): string {
    return item.sourceTagName || item.tagName || '';
}

export function withNormalizedSourceTagName<T extends SourceTagNameInput>(
    item: T,
): NormalizedSourceTagName<T> {
    const { tagName, sourceTagName, ...rest } = item as T & SourceTagNameCarrier;

    return {
        ...rest,
        sourceTagName: sourceTagName || tagName || '',
    } as NormalizedSourceTagName<T>;
}

export function normalizeSourceTagNames<T extends SourceTagNameInput>(
    items: T[],
): Array<NormalizedSourceTagName<T>> {
    return items.map((item) => withNormalizedSourceTagName(item));
}
