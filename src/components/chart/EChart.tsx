import EChartsReactCore from 'echarts-for-react/lib/core';
import type { EChartsReactProps } from 'echarts-for-react/lib/types';
import { useEcharts } from '@/plugin/echartsRuntime';

export type EChartProps = Omit<EChartsReactProps, 'echarts'>;

/**
 * `echarts-for-react` 를 앱의 단일 런타임에 묶은 드롭인 래퍼.
 *
 * 패키지의 기본 진입점(`echarts-for-react`)은 `lib/index.js` 에서 `require('echarts')` 를 해
 * 번들 사본을 끌고 온다. 서버가 주는 `/web/echarts/echarts.min.js` 와 두 벌이 되는 지점이
 * 바로 여기다. `lib/core` 는 echarts 를 import 하지 않고 `props.echarts` 로 주입받으므로,
 * 라이브러리를 바꾸지 않고 런타임만 갈아끼울 수 있다.
 *
 * 런타임이 아직 없으면 아무것도 렌더하지 않는다 — 차트 영역의 로딩 표시는 호출부가 이미
 * 가진 오버레이가 담당한다.
 */
export function EChart(props: EChartProps) {
    const { echarts } = useEcharts();
    if (!echarts) return null;
    return <EChartsReactCore echarts={echarts} {...props} />;
}

export default EChart;
