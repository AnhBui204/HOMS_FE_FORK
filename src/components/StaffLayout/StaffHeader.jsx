import React from 'react';
import { Layout, Button, Breadcrumb, Badge } from 'antd';
import { BellOutlined, SettingOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import useUser from '../../contexts/UserContext';
import { clearAccessToken } from '../../services/authService';

const { Header } = Layout;

const StaffHeader = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useUser();

    const PAGE_LABELS = {
        staff: 'Staff', dashboard: 'Dashboard', orders: 'Order List',
        delivery: 'Delivery', incidents: 'Incident Report', chat: 'Chat',
    };
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbItems = pathnames.map((name) => ({
        title: PAGE_LABELS[name] || name.charAt(0).toUpperCase() + name.slice(1),
    }));

    const handleLogout = () => {
        logout();
        clearAccessToken();
        navigate('/login');
    };

    return (
        <Header style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            height: '70px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        }}>
            <div>
                <Breadcrumb items={[{ title: 'Staff' }, ...breadcrumbItems.slice(1)]} />
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Button type="text" icon={<SettingOutlined style={{ fontSize: 16 }} />} />
                <Button type="text" icon={<UserOutlined style={{ fontSize: 16 }} />} />
                <Badge count={3} size="small">
                    <Button type="text" icon={<BellOutlined style={{ fontSize: 16 }} />} />
                </Badge>
                <Button
                    type="primary"
                    danger
                    icon={<LogoutOutlined />}
                    style={{ borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={handleLogout}
                >
                    Sign Out
                </Button>
            </div>
        </Header>
    );
};

export default StaffHeader;
