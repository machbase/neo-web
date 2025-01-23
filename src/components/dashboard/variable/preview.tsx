import './preview.scss';
import { VARIABLE_TYPE } from '.';
import { Tooltip } from 'react-tooltip';

export const VariablePreview = ({ pBoardInfo }: { pBoardInfo: any }) => {
    return (
        <div className="board-header-variable-preview-wrap">
            <div className="board-header-variable-preview">
                {pBoardInfo &&
                    pBoardInfo?.dashboard &&
                    pBoardInfo?.dashboard?.variables &&
                    pBoardInfo?.dashboard?.variables?.map((variable: VARIABLE_TYPE, idx: number) => {
                        return (
                            <div className={`board-header-variable-preview-item-${idx} board-header-variable-preview-item`} key={'board-variable-item-' + idx.toString()}>
                                <div className="board-header-variable-preview-item-key">{variable.use.value}</div>
                                <Tooltip anchorSelect={`.board-header-variable-preview-item-${idx}`} content={variable.label} />
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
