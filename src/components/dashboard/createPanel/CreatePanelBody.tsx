import Panel from '../panels/Panel';
import './CreatePanelBody.scss';
const CreatePanelBody = ({ pLoopMode, pType, pPanelInfo, pBoardInfo, pInsetDraging, pModifyState, pSetModifyState, pBoardTimeMinMax }: any) => {
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
                    pBoardTimeMinMax={pBoardTimeMinMax}
                    pIsHeader={false}
                />
            )}
        </div>
    );
};
export default CreatePanelBody;
