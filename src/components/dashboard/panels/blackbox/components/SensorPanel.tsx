// Sensor Panel Component

import { useRef, useEffect } from 'react';
import { Sensor, SensorSample } from '../types/blackbox';
import './SensorPanel.scss';

interface SensorPanelProps {
    sensors: Sensor[];
    selectedSensors: Set<string>;
    sensorLabelMap: Record<string, string>;
    sensorSamples: SensorSample[];
    sensorCursorTime: Date | null;
    sensorWindowStart: Date | null;
    sensorWindowEnd: Date | null;
    onToggleSensor: (sensorId: string) => void;
}

const PALETTE = ['#2563eb', '#dc2626', '#10b981', '#f97316', '#8b5cf6', '#0ea5e9', '#facc15'];

const SensorPanel = ({
    sensors,
    selectedSensors,
    sensorLabelMap,
    sensorSamples,
    sensorCursorTime,
    sensorWindowStart,
    sensorWindowEnd,
    onToggleSensor,
}: SensorPanelProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draw chart on canvas (fallback - no Chart.js dependency)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const displayWidth = canvas.clientWidth || 600;
        const displayHeight = canvas.clientHeight || 280;
        const pixelWidth = Math.round(displayWidth * dpr);
        const pixelHeight = Math.round(displayHeight * dpr);

        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        const padding = { top: 32, right: 20, bottom: 36, left: 56 };
        const plotWidth = Math.max(displayWidth - padding.left - padding.right, 10);
        const plotHeight = Math.max(displayHeight - padding.top - padding.bottom, 10);

        const selectedArray = Array.from(selectedSensors);

        if (!selectedArray.length) {
            ctx.fillStyle = '#1f2933';
            ctx.font = "14px 'Segoe UI', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('표시할 센서를 선택해 주세요.', displayWidth / 2, displayHeight / 2);
            ctx.restore();
            return;
        }

        const validSamples = sensorSamples.filter(s => s && s.values);
        if (!validSamples.length) {
            ctx.fillStyle = '#1f2933';
            ctx.font = "14px 'Segoe UI', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('센서 데이터가 없습니다.', displayWidth / 2, displayHeight / 2);
            ctx.restore();
            return;
        }

        const windowStart = sensorWindowStart || validSamples[0].time;
        const windowEnd = sensorWindowEnd || validSamples[validSamples.length - 1].time;
        const startTime = windowStart.getTime();
        const endTime = windowEnd.getTime();
        const spanMs = Math.max(endTime - startTime, 1);

        // Collect all values for range calculation
        const allValues: number[] = [];
        validSamples.forEach(sample => {
            selectedArray.forEach(sensorId => {
                const value = sample.values[sensorId];
                if (typeof value === 'number' && Number.isFinite(value)) {
                    allValues.push(value);
                }
            });
        });

        if (!allValues.length) {
            ctx.fillStyle = '#1f2933';
            ctx.font = "14px 'Segoe UI', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('선택한 센서의 데이터가 없습니다.', displayWidth / 2, displayHeight / 2);
            ctx.restore();
            return;
        }

        let minValue = Math.min(...allValues);
        let maxValue = Math.max(...allValues);
        if (minValue === maxValue) {
            const delta = Math.abs(minValue) > 1 ? Math.abs(minValue) * 0.1 : 1;
            minValue -= delta;
            maxValue += delta;
        }
        const valueRange = maxValue - minValue;

        const xForTime = (date: Date) => {
            const ratio = Math.min(Math.max((date.getTime() - startTime) / spanMs, 0), 1);
            return padding.left + ratio * plotWidth;
        };

        const yForValue = (value: number) => {
            const ratio = Math.min(Math.max((value - minValue) / valueRange, 0), 1);
            return padding.top + (1 - ratio) * plotHeight;
        };

        // Draw axes
        ctx.strokeStyle = '#cbd5f5';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + plotHeight);
        ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
        ctx.stroke();

        // Draw horizontal grid and labels
        ctx.font = "11px 'Segoe UI', sans-serif";
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const horizontalSteps = 4;
        for (let step = 0; step <= horizontalSteps; step++) {
            const ratio = step / horizontalSteps;
            const value = maxValue - ratio * valueRange;
            const y = padding.top + ratio * plotHeight;
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + plotWidth, y);
            ctx.stroke();
            ctx.fillStyle = '#475569';
            ctx.fillText(value.toFixed(2), padding.left - 8, y);
        }

        // Draw data lines
        selectedArray.forEach((sensorId, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            let started = false;
            validSamples.forEach(sample => {
                const value = sample.values[sensorId];
                if (typeof value !== 'number' || !Number.isFinite(value)) return;
                const x = xForTime(sample.time);
                const y = yForValue(value);
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        });

        // Draw cursor line
        if (sensorCursorTime && sensorCursorTime >= windowStart && sensorCursorTime <= windowEnd) {
            const cursorX = xForTime(sensorCursorTime);
            ctx.strokeStyle = '#ef4444';
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cursorX, padding.top);
            ctx.lineTo(cursorX, padding.top + plotHeight);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }, [selectedSensors, sensorSamples, sensorCursorTime, sensorWindowStart, sensorWindowEnd]);

    return (
        <section className="blackbox-sensor-panel">
            <div className="sensor-toolbar">
                <h2>센서 정보</h2>
                <div className="sensor-list">
                    {sensors.map(sensor => (
                        <label key={sensor.id}>
                            <input
                                type="checkbox"
                                checked={selectedSensors.has(sensor.id)}
                                onChange={() => onToggleSensor(sensor.id)}
                            />
                            <span>{sensorLabelMap[sensor.id] || sensor.id}</span>
                        </label>
                    ))}
                </div>
            </div>
            <canvas ref={canvasRef} className="sensor-chart" />
        </section>
    );
};

export default SensorPanel;
