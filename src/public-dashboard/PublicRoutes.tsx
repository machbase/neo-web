import { Routes as Switch, Route } from 'react-router-dom';
import DashboardView from './components/Dashboard/DashboardView';

export const PublicRoutes = () => {
    return (
        <Switch>
            {/* 공개 대시보드 뷰 */}
            <Route path="/*" element={<DashboardView />} />
            
            {/* 기본 경로는 404로 리디렉션 */}
            <Route path="/" element={
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh',
                    background: '#1e1e1e',
                    color: '#fff'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <h2>Public Dashboard</h2>
                        <p>Please specify a dashboard file to view (e.g., /public/dashboard-name.dsh)</p>
                    </div>
                </div>
            } />
        </Switch>
    );
};