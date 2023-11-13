import './PanelFooter.scss';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOUTFOUR from '@/assets/image/btn_zoom out x4@3x.png';
import { MdCenterFocusStrong } from '@/assets/icons/Icon';
const PanelFooter = ({ pSetButtonRange, pPanelInfo }: any) => {
    const setNaviLocation = () => {
        if (pPanelInfo.tag_set.length <= 6) return 92 + 'px';
        else return 92 + 16 + 'px';
    };
    return (
        <div className="footer-form">
            <div></div>
            <div></div>
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
                <button onClick={() => pSetButtonRange('I', 0.4)}>
                    <img src={ZoomInFour} />
                </button>
                <button onClick={() => pSetButtonRange('I', 0.2)}>
                    <img src={ZoomInTwo} />
                </button>
                <button onClick={() => pSetButtonRange()}>
                    <MdCenterFocusStrong></MdCenterFocusStrong>
                </button>
                <button onClick={() => pSetButtonRange('O', 0.2)}>
                    <img src={ZoomOutTwo} />
                </button>
                <button onClick={() => pSetButtonRange('O', 0.4)}>
                    <img src={ZoomOUTFOUR} />
                </button>
            </div>
        </div>
    );
};

export default PanelFooter;
