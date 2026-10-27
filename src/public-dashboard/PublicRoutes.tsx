import { Routes as Switch, Route } from 'react-router-dom';
import DashboardView from './components/Dashboard/DashboardView';

export const PublicRoutes = () => {
    return (
        <Switch>
            <Route path="/*" element={<DashboardView />} />
            
            <Route path="/" element={
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh',
                    background: 'var(--neo-bg-primary, #1e1e1e)',
                    color: 'var(--neo-text-primary, #fff)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <h2>Public Dashboard</h2>
                        <p>Please specify a dashboard file to view (e.g., /board/dashboard-name.dsh)</p>
                    </div>
                </div>
            } />
        </Switch>
    );
};