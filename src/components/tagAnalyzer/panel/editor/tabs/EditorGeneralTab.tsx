import { Checkbox, Input } from '@/design-system/components';
import { useLayoutEffect } from 'react';
import type { PanelInfo } from '../../panelModel';
import { Section } from './TabControls';
import styles from '../PanelEditorTab.module.scss';

type EditorGeneralTabProps = {
    pTitle: PanelInfo['title'];
    pModeConfig: PanelInfo['mode'];
    pDisplayConfig: PanelInfo['display'];
    pTimeConfig: PanelInfo['time'];
    pOnChangeTitle: (title: PanelInfo['title']) => void;
    pOnChangeModeConfig: (modeConfig: PanelInfo['mode']) => void;
    pOnChangeDisplayConfig: (displayConfig: PanelInfo['display']) => void;
    pOnChangeTimeConfig: (timeConfig: PanelInfo['time']) => void;
    pReportValidity: (tab: 'General', isValid: boolean, message?: string) => void;
    pIsActive: boolean;
};

function EditorGeneralTab({
    pTitle,
    pModeConfig,
    pDisplayConfig,
    pTimeConfig,
    pOnChangeTitle,
    pOnChangeModeConfig,
    pOnChangeDisplayConfig,
    pOnChangeTimeConfig,
    pReportValidity,
    pIsActive,
}: EditorGeneralTabProps) {
    const sIsValid = pTitle.trim() !== '';
    useLayoutEffect(() => {
        pReportValidity(
            'General',
            sIsValid,
            sIsValid ? undefined : 'Enter a panel title.',
        );
    }, [pReportValidity, sIsValid]);
    if (!pIsActive) return null;
    return (
        <Section title="Chart title">
            <div className={styles.controlGrid}>
                <Input
                    data-testid="editor-title-input"
                    aria-label="Chart title"
                    value={pTitle}
                    onChange={(event) => pOnChangeTitle(event.target.value)}
                    size="md"
                    className={styles.titleInput}
                />
            </div>
            <div className={styles.controlStack}>
                <Checkbox
                    data-testid="editor-use-zoom-checkbox"
                    checked={pDisplayConfig.useZoom}
                    onChange={(event) =>
                        pOnChangeDisplayConfig({
                            ...pDisplayConfig,
                            useZoom: event.target.checked,
                        })
                    }
                    label="Use Zoom when dragging"
                    size="sm"
                />
                <span
                    title={
                        pModeConfig.isRaw
                            ? undefined
                            : 'This option is only for raw data.'
                    }
                >
                    <Checkbox
                        data-testid="editor-order-raw-checkbox"
                        checked={!pModeConfig.isRaw || pModeConfig.isOrderBy}
                        disabled={!pModeConfig.isRaw}
                        onChange={(event) =>
                            pModeConfig.isRaw &&
                            pOnChangeModeConfig({
                                ...pModeConfig,
                                isOrderBy: event.target.checked,
                            })
                        }
                        label="Order raw data by time"
                        size="sm"
                    />
                </span>
                <Checkbox
                    data-testid="editor-normalize-checkbox"
                    checked={pModeConfig.useNormalize}
                    onChange={(event) =>
                        pOnChangeModeConfig({
                            ...pModeConfig,
                            useNormalize: event.target.checked,
                        })
                    }
                    label="Normalize values"
                    size="sm"
                />
                <Checkbox
                    data-testid="editor-save-visible-range-checkbox"
                    checked={pTimeConfig.useLastViewedRange}
                    onChange={(event) =>
                        pOnChangeTimeConfig({
                            ...pTimeConfig,
                            useLastViewedRange: event.target.checked,
                            lastViewedRange: event.target.checked
                                ? pTimeConfig.lastViewedRange
                                : undefined,
                        })
                    }
                    label="Save current visible range in TAZ"
                    size="sm"
                />
                <span className={styles.savedRangeNote}>
                    {pTimeConfig.useLastViewedRange
                        ? 'Save and Save As will include the current visible range.'
                        : 'Save and Save As will use the configured panel range.'}
                </span>
            </div>
        </Section>
    );
}

export default EditorGeneralTab;
