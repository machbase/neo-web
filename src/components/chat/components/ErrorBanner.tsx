import './ErrorBanner.scss';

interface ErrorBannerProps {
    code: number;
    message: string;
}

export const ErrorBanner = ({ code, message }: ErrorBannerProps) => {
    if (!message || message.length === 0) return null;

    return (
        <div className="error-banner">
            <div className="error-banner-content">
                <span className="error-banner-icon">⚠</span>
                <div className="error-banner-text">
                    <div className="error-banner-title">Error Code: {code}</div>
                    <div className="error-banner-message">{message}</div>
                </div>
            </div>
        </div>
    );
};
