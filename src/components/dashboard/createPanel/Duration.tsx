import { Page, Input as DSInput } from '@/design-system/components';

export const Duration = ({ pBlockInfo, pSetPanelOption }: { pBlockInfo: any; pSetPanelOption: any }) => {
    const sDurationRegex = /^[0-9smhdwMy+-]+$/;
    const handleOption = (e: any, target: string) => {
        if (!sDurationRegex.test(e.target.value) && e.target.value !== '') return;
        const sTmpBlockInfo = JSON.parse(JSON.stringify(pBlockInfo));
        sTmpBlockInfo.duration[target] = e.target.value;
        pSetPanelOption((prev: any) => {
            const updateBlockList = prev.blockList.map((aBlock: any) => {
                if (aBlock.id === pBlockInfo.id) return sTmpBlockInfo;
                else return aBlock;
            });
            return { ...prev, blockList: updateBlockList };
        });
    };

    return (
        <>
            <Page.Divi />
            <Page.ContentBlock style={{ padding: '4px' }} pHoverNone>
                <Page.DpRow style={{ gap: '4px', flexFlow: 'wrap' }}>
                    <DSInput
                        label="Duration From"
                        labelPosition="left"
                        placeholder="From  ex) -30s"
                        type="text"
                        value={pBlockInfo?.duration?.from ?? ''}
                        onChange={(aEvent: any) => handleOption(aEvent, 'from')}
                        size="md"
                        style={{ width: '160px' }}
                    />
                    <DSInput
                        label="Duration To"
                        labelPosition="left"
                        placeholder="To  ex) +30s"
                        type="text"
                        value={pBlockInfo?.duration?.to ?? ''}
                        onChange={(aEvent: any) => handleOption(aEvent, 'to')}
                        size="md"
                        style={{ width: '160px' }}
                    />
                </Page.DpRow>
            </Page.ContentBlock>
        </>
    );
};
