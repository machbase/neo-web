import Panel from '../panels/Panel';
import './CreatePanelBody.scss';
const CreatePanelBody = ({ pType, pPanelInfo, pBoardInfo, pInsetDraging, pModifyState, pSetModifyState }: any) => {
    return (
        <div className="chart-body">
            {pPanelInfo && (
                <Panel pBoardInfo={pBoardInfo} pPanelInfo={pPanelInfo} pInsetDraging={pInsetDraging} pType={pType} pModifyState={pModifyState} pSetModifyState={pSetModifyState} />
            )}
        </div>
    );
};
export default CreatePanelBody;
