import { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Page, TextHighlight } from '@/design-system/components';
import { MdEdit, MdDelete, MdAdd } from 'react-icons/md';
import { EventsModal } from './eventsModal';
import styles from './eventsModal.module.scss';
import { getEventRules, EventRuleItem, deleteEventRule, updateEventRule } from '@/api/repository/mediaSvr';
import { ConfirmModal } from '@/components/modal/ConfirmModal';

export type EventRule = {
    id: string;
    name: string;
    expression: string;
    recordMode: string;
    enabled: boolean;
};

const ITEMS_PER_PAGE = 6;

// Convert API response to local EventRule format
const mapApiRuleToLocal = (apiRule: EventRuleItem): EventRule => ({
    id: apiRule.rule_id,
    name: apiRule.name,
    expression: apiRule.expression_text,
    recordMode: apiRule.record_mode === 'ALL_MATCHES' ? 'ALL' : 'EDGE',
    enabled: apiRule.enabled,
});

export type EventsConfigProps = {
    selectedCamera?: string;
    onDetectObjectsChange?: () => void;
};

export const EventsConfig = ({ selectedCamera, onDetectObjectsChange }: EventsConfigProps) => {
    const [rules, setRules] = useState<EventRule[]>([]);
    // const [currentPage, setCurrentPage] = useState(0);

    // Fetch event rules when selectedCamera changes
    const fetchRules = useCallback(async (cameraId: string) => {
        try {
            const res = await getEventRules(cameraId);
            if (res.success && res.data?.event_rules) {
                setRules(res.data.event_rules.map(mapApiRuleToLocal));
            }
        } catch (err) {
            console.error('Failed to fetch event rules:', err);
        }
    }, []);

    useEffect(() => {
        if (selectedCamera) {
            fetchRules(selectedCamera);
        }
    }, [selectedCamera, fetchRules]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editRule, setEditRule] = useState<EventRule | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

    // const totalPages = Math.ceil(rules.length / ITEMS_PER_PAGE);
    const currentPage = 0;
    const pagedRules = rules.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

    const handleToggleRule = async (id: string) => {
        if (!selectedCamera) return;

        const rule = rules.find((r) => r.id === id);
        if (!rule) return;

        try {
            // Map local recordMode back to API format
            const apiRecordMode = rule.recordMode === 'ALL' ? 'ALL_MATCHES' : 'EDGE_ONLY';

            // Update rule enabled status with all rule data
            const response = await updateEventRule(selectedCamera, id, {
                name: rule.name,
                expression_text: rule.expression,
                record_mode: apiRecordMode as 'ALL_MATCHES' | 'EDGE_ONLY',
                enabled: !rule.enabled,
            });

            if (response.success) {
                // Refresh rules list after successful update
                fetchRules(selectedCamera);
            } else {
                console.error('Failed to toggle rule status:', response.reason);
            }
        } catch (error) {
            console.error('Failed to toggle rule status:', error);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteRuleId(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedCamera || !deleteRuleId) return;

        try {
            const response = await deleteEventRule(selectedCamera, deleteRuleId);

            if (response.success) {
                // Refresh rules list after successful deletion
                fetchRules(selectedCamera);
                setIsDeleteModalOpen(false);
                setDeleteRuleId(null);
            } else {
                console.error('Failed to delete rule:', response.reason);
            }
        } catch (error) {
            console.error('Failed to delete rule:', error);
        }
    };

    const handleCreate = () => {
        setEditRule(null);
        setIsModalOpen(true);
    };

    const handleEdit = (rule: EventRule) => {
        setEditRule(rule);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditRule(null);
    };

    const handleModalSuccess = () => {
        if (selectedCamera) {
            fetchRules(selectedCamera);
        }
    };

    return (
        <>
            <div>
                <Page.DpRow style={{ textWrap: 'nowrap', gap: '20px' }}>
                    <Page.ContentTitle>Rules</Page.ContentTitle>
                    <Page.Divi direction="horizontal" />
                    <Button variant="primary" size="sm" icon={<MdAdd size={14} />} onClick={handleCreate}>
                        Create Rule
                    </Button>
                </Page.DpRow>
                <Page.Space />
                <Page.Body>
                    <table className={styles.rules__table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>DSL Expression</th>
                                <th>Record Mode</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedRules.length > 0 ? (
                                pagedRules.map((rule) => (
                                    <tr key={rule.id}>
                                        <td>
                                            <div className={styles.rules__name}>{rule.name}</div>
                                            <div className={styles.rules__id}>{rule.id}</div>
                                        </td>
                                        <td className={styles.rules__expression_cell}>
                                            <Badge variant="primary" size="md">
                                                <TextHighlight variant="neutral" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {rule.expression}
                                                </TextHighlight>
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge
                                                variant="muted"
                                                isToolTip
                                                toolTipContent={rule.recordMode === 'ALL' ? 'Record all matches' : 'Trigger on change'}
                                            >
                                                <TextHighlight variant="neutral" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {rule.recordMode}
                                                </TextHighlight>
                                            </Badge>
                                        </td>
                                        <td>
                                            <Page.Switch pState={rule.enabled} pCallback={() => handleToggleRule(rule.id)} />
                                        </td>
                                        <td>
                                            <div className={styles.rules__actions}>
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(rule)}>
                                                    <MdEdit size={16} />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(rule.id)}>
                                                    <MdDelete size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className={styles.rules__empty}>
                                        No registered event rules.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Page.Body>
            </div>
            {/* Create / Edit Modal */}
            <EventsModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                selectedCamera={selectedCamera}
                editRule={editRule}
                ruleCount={rules.length}
                onSuccess={handleModalSuccess}
                onDetectObjectsChange={onDetectObjectsChange}
            />

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deleteRuleId && (
                <ConfirmModal
                    setIsOpen={setIsDeleteModalOpen}
                    pContents={
                        <>
                            Are you sure you want to delete event rule <strong>"{rules.find((r) => r.id === deleteRuleId)?.name || deleteRuleId}"</strong>?
                            <br />
                            This action cannot be undone.
                        </>
                    }
                    pCallback={handleConfirmDelete}
                />
            )}
        </>
    );
};
