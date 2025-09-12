import './PanelFooter.scss';
import ZoomInTwo from '../../assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '../../assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '../../assets/image/btn_zoom out x2@3x.png';
import ZoomOUTFOUR from '../../assets/image/btn_zoom out x4@3x.png';
import { ArrowLeft, ArrowRight, MdCenterFocusStrong } from '../../assets/icons/Icon';
import { changeUtcToText } from '../../utils/helpers/date';
import { IconButton } from '../../components/buttons/IconButton';
const PanelFooter = ({ pSetButtonRange, pPanelInfo, pNavigatorRange, pMoveNavigatorTimRange }: any) => {
    const setNaviLocation = () => {
        if (pPanelInfo.tag_set.length <= 6) return 92 + 'px';
        else return 92 + 16 + 'px';
    };
    return (
        <div className="footer-form">
            <div
                style={
                    pPanelInfo.show_legend === 'Y'
                        ? {
                              bottom: setNaviLocation(),
                          }
                        : {
                              bottom: '60px',
                          }
                }
                className="toolbar"
            >
                <div className="arrow-form">
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pIsToopTip
                        pToolTipContent={'Move range'}
                        pToolTipId={'move-time-left'}
                        pIcon={<ArrowLeft />}
                        onClick={() => pMoveNavigatorTimRange('l')}
                    />
                    <div>{pNavigatorRange.startTime && changeUtcToText(pNavigatorRange.startTime)}</div>
                </div>
                <div className="toolbar-list">
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pIsToopTip
                        pToolTipContent={'Zoom in'}
                        pToolTipId={'zoom-in-four'}
                        pIcon={<img src={ZoomInFour} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange('I', 0.4)}
                    />
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pIsToopTip
                        pToolTipContent={'Zoom in'}
                        pToolTipId={'zoom-in-two'}
                        pIcon={<img src={ZoomInTwo} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange('I', 0.2)}
                    />
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pIsToopTip
                        pToolTipContent={'Focus'}
                        pToolTipId={'taz-focus'}
                        pIcon={<MdCenterFocusStrong style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange()}
                    />
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pIsToopTip
                        pToolTipContent={'Zoom out'}
                        pToolTipId={'zoom-out-two'}
                        pIcon={<img src={ZoomOutTwo} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange('O', 0.2)}
                    />
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pIsToopTip
                        pToolTipContent={'Zoom out'}
                        pToolTipId={'zoom-out-four'}
                        pIcon={<img src={ZoomOUTFOUR} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange('O', 0.4)}
                    />
                </div>
                <div className="arrow-form">
                    <div>{pNavigatorRange.endTime && changeUtcToText(pNavigatorRange.endTime)}</div>
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pIsToopTip
                        pToolTipContent={'Move range'}
                        pToolTipId={'move-time-right'}
                        pIcon={<ArrowRight />}
                        onClick={() => pMoveNavigatorTimRange('r')}
                    />
                </div>
            </div>
        </div>
    );
};

export default PanelFooter;
