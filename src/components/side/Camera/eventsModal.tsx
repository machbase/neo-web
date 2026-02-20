import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Button, Dropdown, Input, Modal, Page } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/components';
import { MdSettings, MdVideoLibrary, MdCode } from 'react-icons/md';
import type { EventRule } from './eventsConfig';
import { DetectObjectPicker } from './DetectObjectPicker';
import { getDetects, getCameraDetectObjects, createEventRule, updateEventRule, updateCameraDetectObjects } from '@/api/repository/mediaSvr';
import styles from './eventsModal.module.scss';

const RECORD_MODE_OPTIONS: DropdownOption[] = [
    { value: 'EDGE_ONLY', label: 'Trigger on change (EDGE)' },
    { value: 'ALL_MATCHES', label: 'Record all matches (ALL)' },
];

export type EventsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    selectedCamera?: string;
    editRule?: EventRule | null;
    ruleCount?: number;
    onSuccess?: () => void;
    onDetectObjectsChange?: () => void;
};

const mapRecordModeToValue = (mode: string) => {
    if (mode === 'EDGE') return 'EDGE_ONLY';
    if (mode === 'ALL') return 'ALL_MATCHES';
    return mode;
};

export const EventsModal = ({ isOpen, onClose, selectedCamera, editRule, ruleCount = 0, onSuccess, onDetectObjectsChange }: EventsModalProps) => {
    // Recognition Targets
    const [targets, setTargets] = useState<string[]>([]);
    const [allDetectObjects, setAllDetectObjects] = useState<string[]>([]);

    // Rule Logic
    const textareaRef = useRef<HTMLInputElement>(null);
    const [ruleExpression, setRuleExpression] = useState('');
    const [expressionError, setExpressionError] = useState<string>('');

    // Configuration Details
    const [ruleId, setRuleId] = useState('');
    const [ruleName, setRuleName] = useState('');
    const [recordMode, setRecordMode] = useState<string>('EDGE_ONLY');

    const [isLoading, setIsLoading] = useState(false);

    const MAX_EXPRESSION_LENGTH = 200;

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
                    setTargets(cameraDetectsRes.data.detect_objects);
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
            // Create mode: set default rule ID with timestamp and rule name with index
            setRuleId(`R_${Date.now()}`);
            setRuleName(`RULE_${ruleCount}`);
            setRuleExpression('');
            setRecordMode('EDGE_ONLY');
        }
    }, [isOpen, editRule]);

    const handleAddTarget = useCallback(
        async (name: string) => {
            if (!name || targets.includes(name) || !selectedCamera) return;

            const newTargets = [...targets, name];

            try {
                // Update camera detect objects via API
                const response = await updateCameraDetectObjects(selectedCamera, {
                    detect_objects: newTargets,
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

            const newTargets = targets.filter((t) => t !== name);

            try {
                // Update camera detect objects via API
                const response = await updateCameraDetectObjects(selectedCamera, {
                    detect_objects: newTargets,
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

    const handleExpressionChange = (value: string) => {
        setRuleExpression(value);
        if (value.length > MAX_EXPRESSION_LENGTH) {
            setExpressionError(`Expression must be ${MAX_EXPRESSION_LENGTH} characters or less (current: ${value.length})`);
        } else {
            setExpressionError('');
        }
    };

    const handleClose = () => {
        // Reset all state when modal closes
        setTargets([]);
        setAllDetectObjects([]);
        setRuleExpression('');
        setExpressionError('');
        setRuleId('');
        setRuleName('');
        setRecordMode('');
        onClose();
    };

    const handleRegister = async () => {
        if (!ruleExpression.trim() || !ruleId.trim() || !ruleName.trim() || !selectedCamera) return;

        // Check expression length
        if (ruleExpression.length > MAX_EXPRESSION_LENGTH) {
            setExpressionError(`Expression must be ${MAX_EXPRESSION_LENGTH} characters or less (current: ${ruleExpression.length})`);
            return;
        }

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
                <Page.Space />

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
                        <DetectObjectPicker items={targets} options={allDetectObjects} onAdd={handleAddTarget} onRemove={handleRemoveTarget} onItemClick={handleTargetClick} />
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
                        <Input ref={textareaRef} fullWidth value={ruleExpression} onChange={(e) => handleExpressionChange(e.target.value)} spellCheck={false} />
                        {expressionError && <Alert variant="error" message={expressionError} className={styles.expressionError} />}
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
