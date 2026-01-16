import { Page } from '@/design-system/components';
import Panel from '../panels/Panel';

const CreatePanelBody = ({ pLoopMode, pType, pPanelInfo, pBoardInfo, pInsetDraging, pModifyState, pSetModifyState, pBoardTimeMinMax }: any) => {
    return (
        <Page style={{ padding: '8px 8px 8px 16px' }}>
            {pPanelInfo && (
                <Panel
                    pLoopMode={pLoopMode}
                    pBoardInfo={pBoardInfo}
                    pPanelInfo={pPanelInfo}
                    pInsetDraging={pInsetDraging}
                    pType={pType}
                    pModifyState={pModifyState}
                    pSetModifyState={pSetModifyState}
                    pBoardTimeMinMax={pBoardTimeMinMax}
                    pIsHeader={false}
                />
            )}
        </Page>
    );
};
export default CreatePanelBody;
