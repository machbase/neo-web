import './PanelFooter.scss';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOUTFOUR from '@/assets/image/btn_zoom out x4@3x.png';
import { ArrowLeft, ArrowRight, MdCenterFocusStrong } from '@/assets/icons/Icon';
import { changeUtcToText } from '@/utils/helpers/date';
import { Button } from '@/design-system/components';
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
                    <Button size="xsm" variant="ghost" isToolTip toolTipContent="Move range" icon={<ArrowLeft size={16} />} onClick={() => pMoveNavigatorTimRange('l')} />
                    <div>{pNavigatorRange.startTime && changeUtcToText(pNavigatorRange.startTime)}</div>
                </div>
                <Button.Group style={{ border: 'solid 0.5px #454545', borderRadius: '4px' }}>
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Zoom in"
                        icon={<img src={ZoomInFour} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange('I', 0.4)}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Zoom in"
                        icon={<img src={ZoomInTwo} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange('I', 0.2)}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Focus"
                        icon={<MdCenterFocusStrong style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange()}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Zoom out"
                        icon={<img src={ZoomOutTwo} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange('O', 0.2)}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Zoom out"
                        icon={<img src={ZoomOUTFOUR} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pSetButtonRange('O', 0.4)}
                    />
                </Button.Group>
                <div className="arrow-form">
                    <div>{pNavigatorRange.endTime && changeUtcToText(pNavigatorRange.endTime)}</div>
                    <Button size="xsm" variant="ghost" isToolTip toolTipContent="Move range" icon={<ArrowRight size={16} />} onClick={() => pMoveNavigatorTimRange('r')} />
                </div>
            </div>
        </div>
    );
};

export default PanelFooter;
