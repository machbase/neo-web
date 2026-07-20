export const TAG_SELECTION_REQUIRED_MESSAGE = 'Please select tag.';

// Panel types that do not depend on tag selection. Values must match ChartTypeList keys in src/utils/constants.ts.
export const TAG_INDEPENDENT_PANEL_TYPES = ['Video', 'Tql chart'];

const hasSelectedTag = (tag: unknown) => {
    return typeof tag === 'string' && tag.trim() !== '';
};

export const getFirstMissingTagSelectionBlockId = (panelOption: any) => {
    if (TAG_INDEPENDENT_PANEL_TYPES.includes(panelOption?.type)) return undefined;

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
