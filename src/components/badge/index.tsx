import './index.scss';

export const BadgeStatus = ({ status = 'error' }: { status?: 'error' | 'success' }) => {
    return (
        <div className={`badge-status ${status === 'success' ? 'badge-status--success' : ''}`}>
            <span>{status === 'success' ? '✓' : '!'}</span>
        </div>
    );
};
