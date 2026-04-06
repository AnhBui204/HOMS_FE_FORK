import React, { useState } from 'react';
import { Layout } from 'antd';
import StaffSidebar from './StaffSidebar';
import StaffHeader from './StaffHeader';
import './StaffLayout.css';

const { Content } = Layout;

const StaffLayout = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <Layout className="staff-layout" style={{ minHeight: '100vh' }}>
            {/* Sidebar - fixed left */}
            <StaffSidebar collapsed={collapsed} onCollapse={setCollapsed} />

            {/* Main Content Area */}
            <Layout
                className="staff-main-layout"
                style={{
                    marginLeft: collapsed ? 0 : 250,
                    transition: 'margin-left 0.2s',
                    minWidth: 0,
                    background: '#f5f7fa'
                }}
            >
                <StaffHeader collapsed={collapsed} onCollapse={setCollapsed} />
                <Content style={{ margin: '24px 24px 0', overflow: 'initial' }}>
                    <div style={{
                        padding: 24,
                        background: '#fff',
                        borderRadius: 8,
                        minHeight: 'calc(100vh - 120px)',
                    }}>
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default StaffLayout;
