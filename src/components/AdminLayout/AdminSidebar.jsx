import React from 'react';
import { Layout, Menu } from 'antd';
import { AreaChartOutlined, UserOutlined, CarOutlined, FileTextOutlined, DollarOutlined, FileDoneOutlined, StarOutlined, GiftOutlined, EnvironmentOutlined, ExclamationCircleOutlined, ToolOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/images/logo.png'; // Using standard logo if available, or just text

const { Sider } = Layout;

const AdminSidebar = ({ collapsed, onCollapse }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            key: '/admin/dashboard',
            icon: <AreaChartOutlined />,
            label: 'Bảng điều khiển',
        },
        {
            key: '/admin/users',
            icon: <UserOutlined />,
            label: 'Quản lý người dùng',
        },
        {
            key: '/admin/vehicles',
            icon: <CarOutlined />,
            label: 'Quản lý phương tiện',
        },
        {
            key: '/admin/reports',
            icon: <ExclamationCircleOutlined />,
            label: 'Báo cáo sự cố & Bồi thường',
        },
        {
            key: '/admin/contracts',
            icon: <FileDoneOutlined />,
            label: 'Quản lý hợp đồng',
        },
        {
            key: '/admin/pricing',
            icon: <DollarOutlined />,
            label: 'Quản Lý Bảng Giá',
        },
        {
            key: '/admin/ratings',
            icon: <StarOutlined />,
            label: 'Đánh giá & Phản hồi',
        },
        {
            key: '/admin/invoices',
            icon: <FileTextOutlined />,
            label: 'Hóa đơn & Doanh thu',
        },
        {
            key: '/admin/routes',
            icon: <EnvironmentOutlined />,
            label: 'Quản lý lộ trình',
        },
        {
            key: '/admin/promotions',
            icon: <GiftOutlined />,
            label: 'Khuyến mãi & Ưu đãi',
        },
        {
            key: '/admin/maintenance',
            icon: <ToolOutlined />,
            label: 'Bảo trì & Sửa chữa',
        }
    ];

    return (
        <Sider 
            breakpoint="lg"
            collapsedWidth="0"
            onCollapse={(c) => onCollapse(c)}
            collapsed={collapsed}
            width={250} 
            theme="light" 
            style={{ 
                borderRight: '1px solid #f0f0f0', 
                height: '100vh', 
                position: 'fixed', 
                left: 0, 
                top: 0, 
                bottom: 0,
                zIndex: 1001 
            }}
        >
            <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Fallback to text if logo has issues, but trying to use image */}
                <img src={logo} alt="HOMS Logo" style={{ height: '40px', width: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
                <h2 style={{ margin: 0, fontWeight: 'bold', color: '#44624A' }}>HOMS</h2>
            </div>
            {/* Scoped styles to make the selected menu item match Figma color #8BA888 */}
            <style>{`.admin-sider-menu .ant-menu-item-selected, .admin-sider-menu .ant-menu-item-active {
                    background-color: #8BA888 !important;
                    color: #ffffff !important;
                    border-radius: 8px;
                }
                .admin-sider-menu .ant-menu-item-selected .anticon, .admin-sider-menu .ant-menu-item-active .anticon {
                    color: #ffffff !important;
                }
                .admin-sider-menu .ant-menu-item {
                    margin: 6px 0;
                    border-radius: 8px;
                }
                .admin-sider-menu .ant-menu-item:hover {
                    background-color: rgba(139,168,136,0.12);
                    color: #ffffff;
                }
            `}</style>
            <Menu
                className="admin-sider-menu"
                mode="inline"
                padding={16}
                selectedKeys={[location.pathname]}
                onClick={({ key }) => navigate(key)}
                items={menuItems}
                style={{ borderRight: 0, padding: '0 12px' }}
            />
            {/* User Profile at bottom */}
            <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f56a00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <UserOutlined />
                </div>
                <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>Admin User</div>
                </div>
            </div>
        </Sider>
    );
};

export default AdminSidebar;