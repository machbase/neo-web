import Panel from '../panels/Panel';
import './CreatePanelBody.scss';
const CreatePanelBody = ({ pLoopMode, pType, pPanelInfo, pBoardInfo, pInsetDraging, pModifyState, pSetModifyState }: any) => {
    return (
        <div className="chart-body">
            {pPanelInfo && (
                <Panel
                    pLoopMode={pLoopMode}
                    pBoardInfo={pBoardInfo}
                    pPanelInfo={pPanelInfo}
                    pInsetDraging={pInsetDraging}
                    pType={pType}
                    pModifyState={pModifyState}
                    pSetModifyState={pSetModifyState}
                    pIsHeader
                />
            )}
        </div>
    );
};
export default CreatePanelBody;
