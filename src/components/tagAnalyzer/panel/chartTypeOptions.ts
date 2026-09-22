import { MdOutlineStackedLineChart, VscGraphLine, VscGraphScatter } from '@/assets/icons/Icon';
import Zone from '@/assets/image/img_chart_01.png';
import Dot from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';

export const PANEL_CHART_TYPES = [
    { type: 'Zone', label: 'Zone', Icon: MdOutlineStackedLineChart, src: Zone, alt: 'Zone Chart' },
    { type: 'Dot', label: 'Scatter', Icon: VscGraphScatter, src: Dot, alt: 'Dot Chart' },
    { type: 'Line', label: 'Line', Icon: VscGraphLine, src: Line, alt: 'Line Chart' },
] as const;
