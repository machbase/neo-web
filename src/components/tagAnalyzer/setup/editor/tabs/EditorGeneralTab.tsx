import { Checkbox, Input } from '@/design-system/components';
import type { PanelInfo } from '../../../model';
import { Section } from './EditorControls';
import styles from '../PanelEditor.module.scss';

type EditorGeneralTabProps = {
    pTitle: PanelInfo['title'];
    pModeConfig: PanelInfo['mode'];
    pDisplayConfig: PanelInfo['display'];
    pTimeConfig: PanelInfo['time'];
    pIsRawMode: boolean;
    pOnChangeTitle: (title: PanelInfo['title']) => void;
    pOnChangeModeConfig: (modeConfig: PanelInfo['mode']) => void;
    pOnChangeDisplayConfig: (displayConfig: PanelInfo['display']) => void;
    pOnChangeTimeConfig: (timeConfig: PanelInfo['time']) => void;
};

function EditorGeneralTab({
    pTitle,
    pModeConfig,
    pDisplayConfig,
    pTimeConfig,
    pIsRawMode,
    pOnChangeTitle,
    pOnChangeModeConfig,
    pOnChangeDisplayConfig,
    pOnChangeTimeConfig,
}: EditorGeneralTabProps) {
    return (
        <Section title="Chart title">
            <div className={styles.controlGrid}>
                <Input
                    aria-label="Chart title"
                    value={pTitle}
                    onChange={(event) => pOnChangeTitle(event.target.value)}
                    size="md"
                    className={styles.titleInput}
                />
            </div>
            <div className={styles.controlStack}>
                <Checkbox
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
                        pIsRawMode
                            ? undefined
                            : 'This option is only for raw data.'
                    }
                >
                    <Checkbox
                        checked={!pIsRawMode || pModeConfig.isOrderBy}
                        disabled={!pIsRawMode}
                        onChange={(event) =>
                            pIsRawMode &&
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
