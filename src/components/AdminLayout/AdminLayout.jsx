import React from 'react';
import { Layout } from 'antd';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const { Content } = Layout;

const AdminLayout = ({ children }) => {
    const [collapsed, setCollapsed] = React.useState(false);

    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
            <AdminSidebar collapsed={collapsed} onCollapse={setCollapsed} />
            <Layout style={{ marginLeft: collapsed ? 0 : 250, transition: 'margin-left 0.2s', minWidth: 0 }}>
                <AdminHeader collapsed={collapsed} onCollapse={setCollapsed} />
                <Content style={{ margin: '16px 16px 0', overflow: 'initial' }}>
                    <div style={{ padding: 24, background: '#fff', borderRadius: '8px', minHeight: 'calc(100vh - 120px)' }}>
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;
