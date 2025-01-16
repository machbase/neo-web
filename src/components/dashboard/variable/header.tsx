import './header.scss';
import { VARIABLE_TYPE } from '.';

export const VariableHeader = ({ pBoardInfo }: { pBoardInfo: any }) => {
    return (
        <div className="board-header-variable-wrap">
            <div className="board-header-variable">
                {pBoardInfo &&
                    pBoardInfo?.dashboard &&
                    pBoardInfo?.dashboard?.variables &&
                    pBoardInfo?.dashboard?.variables?.map((variable: VARIABLE_TYPE, idx: number) => {
                        return (
                            <div className="board-header-variable-item" key={'board-variable-item-' + idx.toString()}>
                                <label className="board-header-variable-item-label">{variable.label}</label>
                                <div className="board-header-variable-item-key">{variable.key}</div>
                                <div className="board-header-variable-item-value">{variable.use.value}</div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
