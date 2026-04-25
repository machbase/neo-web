export const TAG_SELECTION_REQUIRED_MESSAGE = 'Please select tag.';

const hasSelectedTag = (tag: unknown) => {
    return typeof tag === 'string' && tag.trim() !== '';
};

export const getFirstMissingTagSelectionBlockId = (panelOption: any) => {
    if (panelOption?.type === 'Video') return undefined;

    const blockList = Array.isArray(panelOption?.blockList) ? panelOption.blockList : [];
    const missingBlock = blockList.find((block: any) => {
        return block?.type === 'tag' && !block?.useCustom && !block?.customFullTyping?.use && !hasSelectedTag(block?.tag);
    });

    return missingBlock?.id;
};

export const getTagSelectionValidationMessage = (panelOption: any) => {
    const hasMissingTagSelection = !!getFirstMissingTagSelectionBlockId(panelOption);

    return hasMissingTagSelection ? TAG_SELECTION_REQUIRED_MESSAGE : undefined;
};
