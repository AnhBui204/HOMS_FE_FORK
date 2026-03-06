import React, { useState } from 'react';
import { Layout, Menu, Button, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  FormOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import AppHeader from './header/header'; 

const { Sider, Content } = Layout;

const DispatcherLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems =[
    {
      key: '/dispatcher/surveys',
      icon: <ScheduleOutlined />,
      label: 'Lên lịch khảo sát',
    },
    {
      key: '/dispatcher/calendar',
      icon: <CalendarOutlined />,
      label: 'Lịch khảo sát',
    },
    {
      key: '/dispatcher/survey-input',
      icon: <FormOutlined />,
      label: 'Nhập TT khảo sát',
    },
    {
      key: '/dispatcher/allocation',
      icon: <TeamOutlined />,
      label: 'Điều phối nhân sự',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* HEADER CHUNG Ở TRÊN CÙNG */}
      <AppHeader />

      {/* PHẦN LAYOUT BÊN DƯỚI GỒM SIDEBAR VÀ CONTENT */}
      <Layout>
        
        {/* SIDEBAR */}
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={collapsed} 
          width={250}
          style={{ background: '#fff' }} // Cho sidebar màu trắng hoặc giữ màu dark tùy bạn
        >
          {/* Nút thu gọn / mở rộng Sidebar */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: '100%' }}
            />
          </div>

          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={(e) => navigate(e.key)}
            style={{ borderRight: 0 }}
          />
        </Sider>

        {/* MAIN CONTENT AREA */}
        <Layout style={{ padding: '24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>
        </Layout>

      </Layout>
    </Layout>
  );
};

export default DispatcherLayout;