import React from 'react';
import { Layout, Menu } from 'antd';
import {
    AppstoreOutlined,
    UnorderedListOutlined,
    CarOutlined,
    WarningOutlined,
    MessageOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/images/logo.png';
import useUser from '../../contexts/UserContext';

const { Sider } = Layout;

const menuItems = [
    { key: '/staff/dashboard', icon: <AppstoreOutlined />,      label: 'Dashboard' },
    { key: '/staff/orders',    icon: <UnorderedListOutlined />,  label: 'Order List' },
    { key: '/staff/delivery',  icon: <CarOutlined />,           label: 'Delivery' },
    { key: '/staff/incidents', icon: <WarningOutlined />,       label: 'Incident Report' },
    { key: '/staff/chat',      icon: <MessageOutlined />,       label: 'Chat' },
];

const StaffSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();

    return (
        <Sider
            width={220}
            theme="light"
            style={{
                borderRight: '1px solid #f0f0f0',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                background: '#fff',
            }}
        >
            {/* Logo */}
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                    src={logo}
                    alt="HOMS"
                    style={{ height: 36 }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span style={{ fontWeight: 700, fontSize: 20, color: '#44624A' }}>HOMS</span>
            </div>

            {/* Menu */}
            <Menu
                mode="inline"
                selectedKeys={[location.pathname]}
                onClick={({ key }) => navigate(key)}
                items={menuItems}
                className="staff-sidebar-menu"
                style={{ borderRight: 0, padding: '0 8px', fontSize: 14 }}
            />

            {/* User info at bottom */}
            <div style={{
                position: 'absolute',
                bottom: 24,
                left: 12,
                right: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
                background: '#fafafa',
            }}>
                <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#44624A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                }}>
                    <UserOutlined />
                </div>
                <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.fullName || 'Staff User'}
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>Staff</div>
                </div>
            </div>
        </Sider>
    );
};

export default StaffSidebar;
