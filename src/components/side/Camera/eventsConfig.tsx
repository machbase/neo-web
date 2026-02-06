import { useState } from 'react';
import { Badge, Button, Page, TextHighlight } from '@/design-system/components';
import { MdEdit, MdDelete, MdAdd } from 'react-icons/md';
import { EventsModal } from './eventsModal';
import styles from './eventsModal.module.scss';
// import { BadgeStatus } from '@/components/badge';

export type EventRule = {
    id: string;
    name: string;
    expression: string;
    recordMode: string;
    lastModified: string;
    enabled: boolean;
};

const ITEMS_PER_PAGE = 6;

// TODO: replace with API data
const MOCK_RULES: EventRule[] = [
    { id: 'safety_check_01', name: 'PPE Safety Alert', expression: 'person > 1 AND helmet = 0', recordMode: 'EDGE', lastModified: '2023-10-24T14:22:10', enabled: true },
    { id: 'vehicle_flow_99', name: 'Vehicle Flow Monitor', expression: 'car > 5 OR truck > 2', recordMode: 'ALL', lastModified: '2023-10-22T09:15:33', enabled: true },
    { id: 'zone_sec_active', name: 'Zone Intrusions', expression: 'intruder_count > 0', recordMode: 'EDGE', lastModified: '2023-10-15T16:02:11', enabled: false },
    { id: 'fire_safety_2', name: 'Smoke Detection', expression: 'smoke_density > 0.4', recordMode: 'ALL', lastModified: '2023-09-29T11:45:00', enabled: true },
    { id: 'forklift_spd_01', name: 'Forklift Speed Alert', expression: 'forklift_speed > 15.0', recordMode: 'EDGE', lastModified: '2023-09-12T16:30:15', enabled: true },
    {
        id: 'nogo_entry_alt',
        name: 'No-Go Zone Entry',
        expression: 'zone_id = "restricted" AND presence = true',
        recordMode: 'EDGE',
        lastModified: '2023-09-05T08:12:44',
        enabled: true,
    },
];

// const formatDate = (iso: string) => {
//     const d = new Date(iso);
//     return {
//         date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
//         time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
//     };
// };

export type EventsConfigProps = {
    selectedCamera?: string;
};

export const EventsConfig = ({ selectedCamera }: EventsConfigProps) => {
    const [rules, setRules] = useState<EventRule[]>(MOCK_RULES);
    // const [currentPage, setCurrentPage] = useState(0);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editRule, setEditRule] = useState<EventRule | null>(null);

    // const totalPages = Math.ceil(rules.length / ITEMS_PER_PAGE);
    const currentPage = 0;
    const pagedRules = rules.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

    const handleToggleRule = (id: string) => {
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    };

    const handleDeleteRule = (id: string) => {
        setRules((prev) => prev.filter((r) => r.id !== id));
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
                                            <Badge variant="muted">
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
                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(rule.id)}>
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
            <EventsModal isOpen={isModalOpen} onClose={handleModalClose} selectedCamera={selectedCamera} editRule={editRule} />
        </>
    );
};
