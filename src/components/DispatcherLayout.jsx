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
  MessageOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import AppHeader from './header/header';

import useUser from '../contexts/UserContext';

const { Sider, Content } = Layout;

const DispatcherLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isVideoChatRoute = location.pathname.includes('/dispatcher/video-chat');
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
    },
    {
      key: '/dispatcher/calendar',
      icon: <CalendarOutlined />,
      label: 'Lịch khảo sát',
      regionalOnly: true,
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
    {
      key: '/dispatcher/video-chat',
      icon: <MessageOutlined />,
      label: 'Nhắn tin & Video call',
    },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.generalOnly && !isGeneral) return false;
    if (item.regionalOnly && isGeneral) return false;
    return true;
  }).map(({ generalOnly, regionalOnly, ...rest }) => rest);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* HEADER CHUNG Ở TRÊN CÙNG */}
      <AppHeader collapsed={collapsed} onToggleSidebar={setCollapsed} />

      {/* PHẦN LAYOUT BÊN DƯỚI GỒM SIDEBAR VÀ CONTENT */}
      <Layout>

        {/* SIDEBAR */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          breakpoint="lg"
          collapsedWidth="80"
          onCollapse={(c) => setCollapsed(c)}
          width={250}
          style={{ 
            background: '#fff',
            height: 'calc(100vh - 64px)',
            position: 'fixed',
            left: 0,
            top: '64px',
            bottom: 0,
            zIndex: 100,
            boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
          }}
        >
          {/* Nút thu gọn / mở rộng Sidebar - only show if not auto-collapsed by breakpoint */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: '100%' }}
            />
          </div>

          {/* Scoped styles to match admin sidebar primary color (#8BA888) */}
          <style>{`.dispatcher-sider-menu .ant-menu-item-selected, .dispatcher-sider-menu .ant-menu-item-active {
                    background-color: #8BA888 !important;
                    color: #ffffff !important;
                    border-radius: 8px;
                }
                .dispatcher-sider-menu .ant-menu-item-selected .anticon, .dispatcher-sider-menu .ant-menu-item-active .anticon {
                    color: #ffffff !important;
                }
                .dispatcher-sider-menu .ant-menu-item {
                    margin: 6px 0;
                    border-radius: 8px;
                }
                .dispatcher-sider-menu .ant-menu-item:hover {
                    background-color: rgba(139,168,136,0.12);
                    color: #ffffff;
                }
            `}</style>

          <Menu
            className="dispatcher-sider-menu"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={(e) => navigate(e.key)}
            style={{ borderRight: 0, padding: '0 12px' }}
          />
        </Sider>

        {/* MAIN CONTENT AREA */}
        <Layout style={{ 
            marginLeft: collapsed ? 80 : 250, 
            transition: 'margin-left 0.2s',
            padding: isVideoChatRoute ? 0 : '16px',
            minWidth: 0 
        }}>
          <Content
            style={{
              padding: isVideoChatRoute ? 0 : 24,
              margin: 0,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: isVideoChatRoute ? 0 : borderRadiusLG,
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