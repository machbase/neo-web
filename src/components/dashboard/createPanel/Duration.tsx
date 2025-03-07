import { Input } from '@/components/inputs/Input';

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
        <div className="values filter">
            <div className="series-table">
                <span className="series-title">Duration</span>
                <div className="series-table" style={{ marginRight: '106px' }}>
                    <Input
                        pPlaceHolder="From  ex) -30s"
                        pBorderRadius={4}
                        pWidth={175}
                        pHeight={26}
                        pType="text"
                        pValue={pBlockInfo?.duration?.from ?? ''}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => handleOption(aEvent, 'from')}
                    />
                </div>
                <div className="series-table">
                    <Input
                        pPlaceHolder="To  ex) +30s"
                        pBorderRadius={4}
                        pWidth={175}
                        pHeight={26}
                        pType="text"
                        pValue={pBlockInfo?.duration?.to ?? ''}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => handleOption(aEvent, 'to')}
                    />
                </div>
            </div>
        </div>
    );
};
