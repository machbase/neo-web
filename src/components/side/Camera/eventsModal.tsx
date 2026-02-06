import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { Badge, Button, Dropdown, Input, Modal, TextHighlight } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/components';
import { MdSettings, MdVideoLibrary, MdCode } from 'react-icons/md';
import type { EventRule } from './eventsConfig';
import styles from './eventsModal.module.scss';

const CHIP_COLORS = ['blue', 'green', 'cyan', 'orange', 'purple', 'red', 'teal', 'indigo'] as const;

const RECORD_MODE_OPTIONS: DropdownOption[] = [
    { value: 'EDGE_ONLY', label: 'EDGE_ONLY (Trigger on change)' },
    { value: 'CONTINUOUS', label: 'CONTINUOUS (Always record)' },
    { value: 'INTERVAL', label: 'INTERVAL (Periodic capture)' },
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
};

const mapRecordModeToValue = (mode: string) => {
    if (mode === 'EDGE') return 'EDGE_ONLY';
    if (mode === 'ALL') return 'CONTINUOUS';
    return mode;
};

export const EventsModal = ({ isOpen, onClose, selectedCamera: _selectedCamera, editRule }: EventsModalProps) => {
    // Recognition Targets
    const [targets, setTargets] = useState<RecognitionTarget[]>([
        { name: 'person', color: 'blue' },
        { name: 'car', color: 'green' },
        { name: 'helmet', color: 'cyan' },
        { name: 'truck', color: 'orange' },
    ]);
    const [newTarget, setNewTarget] = useState('');

    // Rule Logic
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [ruleExpression, setRuleExpression] = useState('');

    // Configuration Details
    const [ruleId, setRuleId] = useState('');
    const [ruleName, setRuleName] = useState('');
    const [recordMode, setRecordMode] = useState<string>('EDGE_ONLY');

    const [isLoading, setIsLoading] = useState(false);

    const isEditMode = !!editRule;

    useEffect(() => {
        if (!isOpen) return;
        if (editRule) {
            setRuleId(editRule.id);
            setRuleName(editRule.name);
            setRuleExpression(editRule.expression);
            setRecordMode(mapRecordModeToValue(editRule.recordMode));
        } else {
            setRuleId('');
            setRuleName('');
            setRuleExpression('');
            setRecordMode('EDGE_ONLY');
        }
    }, [isOpen, editRule]);

    const handleAddTarget = useCallback(() => {
        const trimmed = newTarget.trim().toLowerCase();
        if (trimmed && !targets.find((t) => t.name === trimmed)) {
            const colorIndex = targets.length % CHIP_COLORS.length;
            setTargets((prev) => [...prev, { name: trimmed, color: CHIP_COLORS[colorIndex] }]);
            setNewTarget('');
        }
    }, [newTarget, targets]);

    const handleTargetKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTarget();
        }
    };

    const handleRemoveTarget = (name: string) => {
        setTargets((prev) => prev.filter((t) => t.name !== name));
    };

    const handleTargetClick = (name: string) => {
        const ta = textareaRef.current;
        const cursorPos = ta ? ta.selectionStart : ruleExpression.length;
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
        onClose();
    };

    const handleRegister = async () => {
        if (!ruleExpression.trim() || !ruleId.trim() || !ruleName.trim()) return;
        setIsLoading(true);
        try {
            // TODO: API call to register/update event rule
            onClose();
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
                        <div className={styles.targets}>
                            {targets.map((target) => (
                                <div onClick={() => handleTargetClick(target.name)}>
                                    <Badge variant="primary">
                                        <TextHighlight variant="neutral" style={{ whiteSpace: 'pre-wrap' }}>
                                            {target.name}
                                        </TextHighlight>
                                        <Button
                                            variant="ghost"
                                            size="xsm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveTarget(target.name);
                                            }}
                                        >
                                            &times;
                                        </Button>
                                    </Badge>
                                </div>
                            ))}
                            <div className={styles['add-target']}>
                                <span className={styles['add-target__prefix']}>+</span>
                                <input
                                    className={styles['add-target__input']}
                                    placeholder="Add Ident..."
                                    value={newTarget}
                                    onChange={(e) => setNewTarget(e.target.value)}
                                    onKeyDown={handleTargetKeyDown}
                                    onBlur={handleAddTarget}
                                />
                            </div>
                        </div>
                    </div>
                </Modal.Content>

                {/* Rule Logic */}
                <Modal.Content>
                    <div className={styles.section}>
                        <span className={styles.section__label}>
                            <MdCode size={14} />
                            Rule Logic
                        </span>
                        <div className={styles['rule-logic']}>
                            <div className={styles['rule-logic__editor']}>
                                <textarea
                                    ref={textareaRef}
                                    className={styles['rule-logic__textarea']}
                                    value={ruleExpression}
                                    onChange={(e) => setRuleExpression(e.target.value)}
                                    spellCheck={false}
                                />
                                <span className={styles['rule-logic__badge']}>DSL Editor</span>
                            </div>
                        </div>
                    </div>
                </Modal.Content>

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
