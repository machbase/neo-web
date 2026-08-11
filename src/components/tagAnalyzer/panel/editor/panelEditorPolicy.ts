import type { PanelInfo } from '../panelModel';

export type PanelEditorReloadPolicy =
    | 'preserveVisibleRange'
    | 'applyConfiguredRange';

export type PanelEditorApplyResolution = {
    nextPanelInfo: PanelInfo;
    reloadPolicy: PanelEditorReloadPolicy;
};

export function resolvePanelEditorApply(
    currentPanelInfo: PanelInfo,
    editorConfig: PanelInfo,
): PanelEditorApplyResolution {
    const configuredRangeIsUnchanged =
        currentPanelInfo.time.rangeInput.start ===
            editorConfig.time.rangeInput.start &&
        currentPanelInfo.time.rangeInput.end ===
            editorConfig.time.rangeInput.end;

    return {
        nextPanelInfo: {
            ...editorConfig,
            query: {
                ...editorConfig.query,
                tagSet: editorConfig.axes.rightY.enabled
                    ? editorConfig.query.tagSet
                    : editorConfig.query.tagSet.map((series) => ({
                          ...series,
                          useSecondaryAxis: false,
                      })),
            },
            time: {
                ...editorConfig.time,
                lastViewedRange:
                    editorConfig.time.useLastViewedRange &&
                    configuredRangeIsUnchanged
                        ? editorConfig.time.lastViewedRange
                        : undefined,
            },
        },
        reloadPolicy: configuredRangeIsUnchanged
            ? 'preserveVisibleRange'
            : 'applyConfiguredRange',
    };
}
