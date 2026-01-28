import { Page, Input, ColorPicker, Dropdown, Button } from '@/design-system/components';
import { generateUUID } from '@/utils';
import { ChartThemeList } from '@/utils/constants';
import { VscClose } from 'react-icons/vsc';

export interface VideoPanelType {
    dependentPanels: string[];
    realtimeStream: boolean;
    enableSync: boolean;
}

export const VIDEO_PANEL_DEFAULT: VideoPanelType = {
    dependentPanels: [],
    realtimeStream: true,
    enableSync: false,
};

interface DependentPanelItem {
    id: string;
    title: string;
    type: string;
}

interface VideoOptionsProps {
    pPanelOption: any;
    pSetPanelOption: any;
    pBoardInfo?: any;
}

const CHART_TYPES = ['Line', 'Bar', 'Scatter', 'Liquidfill', 'Pie', 'Gauge', 'Geomap'];

export const VideoOptions = ({ pPanelOption, pSetPanelOption, pBoardInfo }: VideoOptionsProps) => {
    const videoInfo: VideoPanelType = {
        ...VIDEO_PANEL_DEFAULT,
        ...pPanelOption.videoInfo,
    };

    // Get available chart panels from dashboard (exclude current panel and non-chart types)
    const availablePanels: DependentPanelItem[] = (pBoardInfo?.dashboard?.panels ?? [])
        .filter((panel: any) => panel.id !== pPanelOption.id && CHART_TYPES.includes(panel.type))
        .map((panel: any) => ({
            id: panel.id,
            title: panel.title || `${panel.type} Panel`,
            type: panel.type,
        }));

    const selectedPanels = availablePanels.filter((panel) => videoInfo.dependentPanels?.includes(panel.id));

    const handleAddPanel = (panelId: string) => {
        if (videoInfo.dependentPanels.includes(panelId)) return;
        pSetPanelOption((prev: any) => ({
            ...prev,
            videoInfo: {
                ...prev.videoInfo,
                dependentPanels: [...(prev.videoInfo?.dependentPanels ?? []), panelId],
            },
        }));
    };

    const handleRemovePanel = (panelId: string) => {
        pSetPanelOption((prev: any) => ({
            ...prev,
            videoInfo: {
                ...prev.videoInfo,
                dependentPanels: (prev.videoInfo?.dependentPanels ?? []).filter((id: string) => id !== panelId),
            },
        }));
    };

    const handleCustomOption = (aValue: string | boolean, aKey: string) => {
        pSetPanelOption((aPrev: any) => ({
            ...aPrev,
            id: generateUUID(),
            [aKey]: aValue,
        }));
    };

    const handleCommonOption = (aValue: string | boolean, aKey: string) => {
        pSetPanelOption((aPrev: any) => ({
            ...aPrev,
            id: generateUUID(),
            commonOptions: {
                ...aPrev.commonOptions,
                [aKey]: aValue,
                isInsideTitle: true,
            },
        }));
    };

    const handleTitle = (aEvent: any) => {
        handleCustomOption(aEvent.target.value, 'title');
        handleCommonOption(aEvent.target.value, 'title');
    };

    // Filter out already selected panels from dropdown options
    const dropdownOptions = availablePanels
        .filter((panel) => !videoInfo.dependentPanels.includes(panel.id))
        .map((panel) => ({
            label: panel.title,
            value: panel.id,
        }));

    return (
        <>
            <Page.Collapse pTrigger="Panel option">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Input label="Title" type="text" fullWidth value={pPanelOption.title} onChange={(aEvent: any) => handleTitle(aEvent)} />
                    <Page.Space />
                    <Dropdown.Root
                        label="Theme"
                        options={ChartThemeList.map((option) => ({ label: option, value: option }))}
                        value={pPanelOption.theme}
                        onChange={(value: string) => handleCustomOption(value, 'theme')}
                        fullWidth
                    >
                        <Dropdown.Trigger />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                </Page.ContentBlock>
            </Page.Collapse>
            <Page.Divi />

            <Page.Collapse title="Dependent Panels">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Page.ContentDesc>Linked synchronized charts</Page.ContentDesc>
                    <Page.Space />

                    {/* Selected panels list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        {selectedPanels?.map((panel) => (
                            <div
                                key={panel.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary, #8899a6)' }}>{panel.type}</span>
                                    <span style={{ fontSize: '13px' }}>{panel.title}</span>
                                </div>
                                <Button size="xsm" variant="ghost" icon={<VscClose />} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => handleRemovePanel(panel.id)} />
                            </div>
                        ))}
                    </div>

                    {/* Add panel dropdown or empty message */}
                    {availablePanels.length === 0 ? (
                        <Page.ContentDesc style={{ color: '#8899a6', fontStyle: 'italic' }}>No available panels to link</Page.ContentDesc>
                    ) : dropdownOptions.length > 0 ? (
                        <Dropdown.Root label="" options={dropdownOptions} value="" onChange={(val) => handleAddPanel(val)} placeholder="Add panel..." fullWidth>
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                    ) : null}
                    <Page.Space />
                    <Page.Divi />
                    <Page.Space />
                    <Page.DpRow style={{ gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Page.ContentDesc>Time sync color</Page.ContentDesc>
                        <ColorPicker color={(pPanelOption?.titleColor as string) ?? '#000000'} onChange={(color: string) => handleCustomOption(color, 'titleColor')} />
                    </Page.DpRow>
                </Page.ContentBlock>
            </Page.Collapse>
        </>
    );
};
