import React, { useState } from 'react';
import { Layout, Menu, Button, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  FormOutlined,
  TeamOutlined,
  ShareAltOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import AppHeader from './header/header';

import useUser from '../contexts/UserContext';

const { Sider, Content } = Layout;

const DispatcherLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  // isGeneral có thể nằm trong user.dispatcherProfile (từ API) 
  // hoặc nằm thẳng trong user (nếu decode từ Token)
  const isGeneral = user?.isGeneral || user?.dispatcherProfile?.isGeneral;

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const allMenuItems = [
    {
      key: '/dispatcher/dashboard',
      icon: <FileTextOutlined />,
      label: 'Bảng điều khiển',
      generalOnly: true,
    },
    {
      key: '/dispatcher/surveys',
      icon: <ScheduleOutlined />,
      label: 'Lên lịch khảo sát',
      generalOnly: true,
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
      regionalOnly: true,
    },
    {
      key: '/dispatcher/allocation',
      icon: <TeamOutlined />,
      label: 'Điều phối nhân sự',
      generalOnly: true,
    },
    {
      key: '/dispatcher/assigned-orders',
      icon: <ShareAltOutlined />,
      label: 'Theo dõi điều phối',
    },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.generalOnly && !isGeneral) return false;
    if (item.regionalOnly && isGeneral) return false;
    return true;
  });

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