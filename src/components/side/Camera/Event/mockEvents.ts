import { VideoEvent } from '@/components/dashboard/panels/video/hooks/useCameraEvents';

const CAMERA_IDS = ['cam-01', 'cam-02', 'cam-03', 'cam-04'];
const RULE_NAMES = ['PPE Safety Alert', 'Intrusion Detection', 'Fire Detection', 'Helmet Check', 'Vehicle Count'];
const RULE_IDS = ['R_safety_01', 'R_intrusion_01', 'R_fire_01', 'R_helmet_01', 'R_vehicle_01'];
const EXPRESSIONS = [
    'person AND NOT helmet',
    'person IN zone_A',
    'fire OR smoke',
    'person AND helmet',
    'car >= 3',
];
const VALUE_LABELS: { value: number; label: string }[] = [
    { value: 2, label: 'MATCH' },
    { value: 1, label: 'TRIGGER' },
    { value: 0, label: 'CLEAR' },
    { value: -1, label: 'ERROR' },
];
const SNAPSHOT_POOL: Record<string, number>[] = [
    { person: 3, helmet: 1 },
    { person: 2 },
    { fire: 1, smoke: 0 },
    { person: 5, helmet: 5 },
    { car: 4 },
    {},
    { person: 1, helmet: 0 },
    { fire: 0, smoke: 1 },
];

const baseTime = new Date('2026-02-23T12:00:00').getTime();

export const MOCK_EVENTS: VideoEvent[] = Array.from({ length: 50 }, (_, i) => {
    const ruleIdx = i % RULE_NAMES.length;
    const camIdx = i % CAMERA_IDS.length;
    const valEntry = VALUE_LABELS[i % VALUE_LABELS.length];
    const snapshot = SNAPSHOT_POOL[i % SNAPSHOT_POOL.length];
    const ts = new Date(baseTime - i * 120_000); // 2 min intervals

    return {
        id: `mock-${i}`,
        timestamp: ts,
        name: RULE_NAMES[ruleIdx],
        value: valEntry.value,
        valueLabel: valEntry.label,
        expressionText: EXPRESSIONS[ruleIdx],
        usedCountsSnapshot: snapshot,
        cameraId: CAMERA_IDS[camIdx],
        ruleId: RULE_IDS[ruleIdx],
    };
});
