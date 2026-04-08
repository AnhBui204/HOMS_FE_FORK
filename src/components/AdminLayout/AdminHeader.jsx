import React from 'react';
import { Layout, Button, Breadcrumb } from 'antd';
import { LogoutOutlined, BellOutlined, SettingOutlined, UserOutlined, MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

const { Header } = Layout;

const AdminHeader = ({ collapsed, onCollapse }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Simple breadcrumb generation based on path
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbItems = pathnames.map((name, index) => {
        const url = `/${pathnames.slice(0, index + 1).join('/')}`;
        return {
            title: name.charAt(0).toUpperCase() + name.slice(1),
            href: url
        };
    });

    const handleLogout = () => {
        // Clear auth tokens/user data from local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login page
        navigate('/login');
    };

    return (
        <Header style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            height: '70px',
            position: 'sticky',
            top: 0,
            zIndex: 1000
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button 
                    type="text" 
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} 
                    onClick={() => onCollapse(!collapsed)}
                    style={{ fontSize: '18px' }}
                />
                <div className="admin-breadcrumb-wrapper">
                    <Breadcrumb items={[{ title: 'Admin' }, ...breadcrumbItems.slice(1)]} />
                </div>
                <style>{`
                    @media (max-width: 576px) {
                        .admin-breadcrumb-wrapper { display: none; }
                    }
                `}</style>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Button type="text" icon={<SettingOutlined />} />
                <Button type="text" icon={<UserOutlined />} />
                <Button type="text" icon={<BellOutlined />} />
                <Button type="default" icon={<LogoutOutlined />} style={{ borderRadius: '6px' }} onClick={handleLogout}>
                    Log Out
                </Button>
            </div>
        </Header>
    );
};

export default AdminHeader;
