export const TAG_SELECTION_REQUIRED_MESSAGE = 'Please select tag.';

const hasSelectedTag = (tag: unknown) => {
    return typeof tag === 'string' && tag.trim() !== '';
};

export const getTagSelectionValidationMessage = (panelOption: any) => {
    const blockList = Array.isArray(panelOption?.blockList) ? panelOption.blockList : [];
    const hasMissingTagSelection = blockList.some((block: any) => {
        return block?.type === 'tag' && !block?.useCustom && !block?.customFullTyping?.use && !hasSelectedTag(block?.tag);
    });

    return hasMissingTagSelection ? TAG_SELECTION_REQUIRED_MESSAGE : undefined;
};
