import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge, Button, Dropdown, Input, Modal, Page, TextHighlight } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/components';
import { MdSettings, MdVideoLibrary, MdCode } from 'react-icons/md';
import type { EventRule } from './eventsConfig';
import { getDetects, getCameraDetectObjects, createEventRule, updateEventRule, updateCameraDetectObjects } from '@/api/repository/mediaSvr';
import styles from './eventsModal.module.scss';

const CHIP_COLORS = ['blue', 'green', 'cyan', 'orange', 'purple', 'red', 'teal', 'indigo'] as const;

const RECORD_MODE_OPTIONS: DropdownOption[] = [
    { value: 'EDGE_ONLY', label: 'EDGE_ONLY (Trigger on change)' },
    { value: 'ALL_MATCHES', label: 'ALL_MATCHES (Record all matches)' },
];

type RecognitionTarget = {
    name: string;
    color: (typeof CHIP_COLORS)[number];
};

export type EventsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    selectedCamera?: string;
    editRule?: EventRule | null;
    onSuccess?: () => void;
    onDetectObjectsChange?: () => void;
};

const mapRecordModeToValue = (mode: string) => {
    if (mode === 'EDGE') return 'EDGE_ONLY';
    if (mode === 'ALL') return 'CONTINUOUS';
    return mode;
};

export const EventsModal = ({ isOpen, onClose, selectedCamera, editRule, onSuccess, onDetectObjectsChange }: EventsModalProps) => {
    // Recognition Targets
    const [targets, setTargets] = useState<RecognitionTarget[]>([]);
    const [allDetectObjects, setAllDetectObjects] = useState<string[]>([]);

    // Rule Logic
    const textareaRef = useRef<HTMLInputElement>(null);
    const [ruleExpression, setRuleExpression] = useState('');

    // Configuration Details
    const [ruleId, setRuleId] = useState('');
    const [ruleName, setRuleName] = useState('');
    const [recordMode, setRecordMode] = useState<string>('EDGE_ONLY');

    const [isLoading, setIsLoading] = useState(false);

    const isEditMode = !!editRule;

    // Fetch detect objects when modal opens with camera ID
    useEffect(() => {
        if (!isOpen || !selectedCamera) return;

        const fetchDetectData = async () => {
            try {
                const [allDetectsRes, cameraDetectsRes] = await Promise.all([getDetects(), getCameraDetectObjects(selectedCamera)]);

                // Handle all detect objects for dropdown options
                if (allDetectsRes.success && allDetectsRes.data?.detect_objects) {
                    setAllDetectObjects(allDetectsRes.data.detect_objects);
                }

                // Handle camera detect objects for initial targets
                if (cameraDetectsRes.success && cameraDetectsRes.data?.detect_objects) {
                    const cameraObjects = cameraDetectsRes.data.detect_objects;
                    setTargets(
                        cameraObjects.map((name, idx) => ({
                            name,
                            color: CHIP_COLORS[idx % CHIP_COLORS.length],
                        }))
                    );
                }
            } catch (err) {
                console.error('Failed to fetch detect objects:', err);
            }
        };

        fetchDetectData();
    }, [isOpen, selectedCamera, isEditMode]);

    // Initialize form data based on editRule
    useEffect(() => {
        if (!isOpen) return;

        if (editRule) {
            // Edit mode: populate with existing rule data
            setRuleId(editRule.id);
            setRuleName(editRule.name);
            setRuleExpression(editRule.expression);
            setRecordMode(mapRecordModeToValue(editRule.recordMode));
        } else {
            // Create mode: reset form
            setRuleId('');
            setRuleName('');
            setRuleExpression('');
            setRecordMode('EDGE_ONLY');
        }
    }, [isOpen, editRule]);

    const handleAddTarget = useCallback(
        async (name: string) => {
            if (!name || targets.find((t) => t.name === name) || !selectedCamera) return;

            const colorIndex = targets.length % CHIP_COLORS.length;
            const newTargets = [...targets, { name, color: CHIP_COLORS[colorIndex] }];

            try {
                // Update camera detect objects via API
                const response = await updateCameraDetectObjects(selectedCamera, {
                    detect_objects: newTargets.map((t) => t.name),
                });

                if (response.success) {
                    setTargets(newTargets);
                    // Notify parent to refresh detect objects
                    onDetectObjectsChange?.();
                } else {
                    console.error('Failed to add detect object:', response.reason);
                }
            } catch (error) {
                console.error('Failed to add detect object:', error);
            }
        },
        [targets, selectedCamera, onDetectObjectsChange]
    );

    const handleRemoveTarget = useCallback(
        async (name: string) => {
            if (!selectedCamera) return;

            const newTargets = targets.filter((t) => t.name !== name);

            try {
                // Update camera detect objects via API
                const response = await updateCameraDetectObjects(selectedCamera, {
                    detect_objects: newTargets.map((t) => t.name),
                });

                if (response.success) {
                    setTargets(newTargets);
                    // Notify parent to refresh detect objects
                    onDetectObjectsChange?.();
                } else {
                    console.error('Failed to remove detect object:', response.reason);
                }
            } catch (error) {
                console.error('Failed to remove detect object:', error);
            }
        },
        [selectedCamera, targets, onDetectObjectsChange]
    );

    const handleTargetClick = (name: string) => {
        const ta = textareaRef.current;
        const cursorPos = ta?.selectionStart ?? ruleExpression.length;
        const before = ruleExpression.slice(0, cursorPos);
        const after = ruleExpression.slice(cursorPos);
        const next = `${before}${name}${after}`;
        const newCursor = cursorPos + name.length;

        setRuleExpression(next);
        requestAnimationFrame(() => {
            if (ta) {
                ta.focus();
                ta.selectionStart = newCursor;
                ta.selectionEnd = newCursor;
            }
        });
    };

    const handleClose = () => {
        // Reset all state when modal closes
        setTargets([]);
        setAllDetectObjects([]);
        setRuleExpression('');
        setRuleId('');
        setRuleName('');
        setRecordMode('EDGE_ONLY');
        onClose();
    };

    const handleRegister = async () => {
        if (!ruleExpression.trim() || !ruleId.trim() || !ruleName.trim() || !selectedCamera) return;
        setIsLoading(true);
        try {
            if (isEditMode) {
                // Edit mode: update existing event rule
                const response = await updateEventRule(selectedCamera, ruleId, {
                    name: ruleName,
                    expression_text: ruleExpression,
                    record_mode: recordMode as 'ALL_MATCHES' | 'EDGE_ONLY',
                    enabled: true,
                });

                if (!response.success) {
                    console.error('Failed to update event rule:', response.reason);
                    return;
                }
            } else {
                // Create mode: create new event rule
                const response = await createEventRule({
                    camera_id: selectedCamera,
                    rule: {
                        rule_id: ruleId,
                        name: ruleName,
                        expression_text: ruleExpression,
                        record_mode: recordMode as 'ALL_MATCHES' | 'EDGE_ONLY',
                        enabled: true,
                    },
                });

                if (!response.success) {
                    console.error('Failed to create event rule:', response.reason);
                    return;
                }
            }

            // Call onSuccess callback to refresh rules list
            onSuccess?.();
            handleClose();
        } catch (error) {
            console.error('Failed to register event rule:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={handleClose} className={styles['events-modal']}>
            <Modal.Header>
                <Modal.Title>
                    <MdVideoLibrary size={18} />
                    {isEditMode ? 'Edit Event Rule' : 'Create Event Rule'}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* Recognition Targets */}
                <Modal.Content>
                    <div className={styles.section}>
                        <div className={styles.section__header}>
                            <span className={styles.section__label}>
                                <MdSettings size={14} />
                                Idents
                            </span>
                            <span className={styles.section__hint}>Click a label to insert it, or 'x' to remove it.</span>
                        </div>
                        <Dropdown.Root
                            fullWidth
                            options={allDetectObjects.filter((d) => !targets.find((t) => t.name === d)).map((d) => ({ label: d, value: d }))}
                            placeholder="Select detect objects"
                            value=""
                            onChange={(val) => handleAddTarget(val)}
                        >
                            <Dropdown.Trigger style={{ minHeight: '44px', height: 'auto', padding: '8px 12px' }}>
                                {() => (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                                        {targets.map((target) => (
                                            <div
                                                key={target.name}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTargetClick(target.name);
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Badge variant="primary">
                                                    <TextHighlight variant="neutral" style={{ whiteSpace: 'pre-wrap' }}>
                                                        {target.name}
                                                    </TextHighlight>
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveTarget(target.name);
                                                        }}
                                                        style={{ marginLeft: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        <TextHighlight variant="muted" style={{ whiteSpace: 'pre-wrap', cursor: 'inherit' }}>
                                                            ✕
                                                        </TextHighlight>
                                                    </span>
                                                </Badge>
                                            </div>
                                        ))}
                                        <TextHighlight variant="muted" style={{ fontSize: '13px' }}>
                                            {targets.length > 0 ? '+ Add more...' : 'Select detect objects'}
                                        </TextHighlight>
                                    </div>
                                )}
                            </Dropdown.Trigger>
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                    </div>
                </Modal.Content>
                <Page.Space />

                {/* Rule Logic */}
                <Modal.Content>
                    <div className={styles.section}>
                        <span className={styles.section__label}>
                            <MdCode size={14} />
                            Rule Logic
                        </span>
                        <Input ref={textareaRef} fullWidth value={ruleExpression} onChange={(e) => setRuleExpression(e.target.value)} spellCheck={false} />
                    </div>
                </Modal.Content>

                <Page.Space />

                {/* Configuration Details */}
                <Modal.Content>
                    <div className={styles.section}>
                        <span className={styles.section__label}>
                            <MdSettings size={14} />
                            Configuration Details
                        </span>
                        <div className={styles.config}>
                            <div>
                                <div className={styles.config__field_label}>Rule ID</div>
                                <Input fullWidth size="md" value={ruleId} onChange={(e) => setRuleId(e.target.value)} placeholder="e.g. safety_check_01" disabled={isEditMode} />
                            </div>
                            <div>
                                <div className={styles.config__field_label}>Rule Name</div>
                                <Input fullWidth size="md" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. PPE Safety Alert" />
                            </div>
                            <div>
                                <div className={styles.config__field_label}>Record Mode</div>
                                <Dropdown.Root options={RECORD_MODE_OPTIONS} value={recordMode} onChange={setRecordMode} fullWidth>
                                    <Dropdown.Trigger />
                                    <Dropdown.Menu>
                                        <Dropdown.List />
                                    </Dropdown.Menu>
                                </Dropdown.Root>
                            </div>
                        </div>
                    </div>
                </Modal.Content>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="primary" onClick={handleRegister} disabled={isLoading || !ruleExpression.trim() || !ruleId.trim() || !ruleName.trim()} loading={isLoading}>
                    {isEditMode ? 'Update Event Rule' : 'Register Event Rule'}
                </Button>
                <Modal.Cancel />
            </Modal.Footer>
        </Modal.Root>
    );
};
