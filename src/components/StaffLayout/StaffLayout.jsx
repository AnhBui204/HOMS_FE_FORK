import React from 'react';
import { Layout } from 'antd';
import StaffSidebar from './StaffSidebar';
import StaffHeader from './StaffHeader';
import './StaffLayout.css';

const { Content } = Layout;

const StaffLayout = ({ children }) => {
    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
            <StaffSidebar />
            <Layout style={{ marginLeft: 220 }}>
                <StaffHeader />
                <Content style={{ margin: '24px 24px 0', overflow: 'initial' }}>
                    <div className="staff-content" style={{
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
