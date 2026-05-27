import { Component, ErrorInfo, ReactNode } from 'react';
import { needsLegacyBrowserNotice } from '@/components/LegacyBrowserNotice/featureDetection';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

    handleReload = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/web/ui/login';
    };

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    handleHardReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const isLegacyBrowser = needsLegacyBrowserNotice();
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: '#1e1e1e',
                        color: '#cccccc',
                        fontFamily: 'sans-serif',
                        padding: '20px',
                        textAlign: 'center',
                    }}
                >
                    <h2 style={{ color: '#ffffff', marginBottom: '16px' }}>An unexpected error occurred</h2>
                    <p style={{ color: '#999999', marginBottom: '24px', maxWidth: '500px' }}>
                        {this.state.error?.message || 'Something went wrong while rendering the page.'}
                    </p>
                    {isLegacyBrowser && (
                        <div
                            style={{
                                marginBottom: '24px',
                                padding: '12px 16px',
                                maxWidth: '500px',
                                backgroundColor: '#3a2d00',
                                border: '1px solid #ff9800',
                                borderRadius: '4px',
                                color: '#ffcc80',
                                fontSize: '13px',
                                lineHeight: 1.5,
                                textAlign: 'left',
                            }}
                        >
                            <strong style={{ color: '#ff9800' }}>⚠ Browser compatibility</strong>
                            <br />
                            This error may be caused by your unsupported browser. Please update to Chrome/Edge 105+, Firefox 121+, or Safari 15.4+, then close all browser windows and reopen this page.
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {isLegacyBrowser ? (
                            <button
                                onClick={this.handleHardReload}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: '#0078d4',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                Reload page
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={this.handleRetry}
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: '#0078d4',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                    }}
                                >
                                    Retry
                                </button>
                                <button
                                    onClick={this.handleReload}
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: '#333333',
                                        color: '#ffffff',
                                        border: '1px solid #555555',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                    }}
                                >
                                    Go to Login
                                </button>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
