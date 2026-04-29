import React, { useState, useEffect } from "react";
import {  Layout, Row, Col, Button, Input, Drawer, Menu, Avatar, Dropdown, Badge, Popover, List, Typography } from "antd";
import { MenuOutlined, SearchOutlined, RightOutlined, BellOutlined, MenuUnfoldOutlined, MenuFoldOutlined } from "@ant-design/icons";
import "./header.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useNotificationSocket from "../../hooks/useNotificationSocket";
import { getNotifications,markNotificationRead } from "../../services/notificationService";
import { useSelector, useDispatch } from "react-redux";
import { logoutUserThunk } from "../../store/authSlice";
const { Header } = Layout;
const { Text } = Typography;
const AppHeader = ({ collapsed, onToggleSidebar }) => {

  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [activeMenu, setActiveMenu] = useState("dashboard"); // State để track menu đang active
const dispatch = useDispatch();
const { user, loading } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const isDispatcherMode = location.pathname.startsWith("/dispatcher");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  useNotificationSocket(user, setNotifications, setUnreadCount);
  // Danh sách menu mới theo yêu cầu
  const navItems = [
    { key: "dashboard", label: "Bảng Điều Khiển", path: "/customer/dashboard" },
    { key: "services", label: "Các Dịch Vụ", path: "/customer/service-packages" },
    { key: "orders", label: "Đơn Chuyển", path: "/customer/order" },
    { key: "transport", label: "Phương Tiện Di Chuyển", path: "/customer/transport" },
    { key: "about", label: "Về Chúng Tôi", path: "/about" },
  ];

  // Update active menu based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const activeItem = navItems.find(item => item.path === currentPath);
    if (activeItem) {
      setActiveMenu(activeItem.key);
    } else {
      setActiveMenu("");
    }
  }, [location.pathname]);
useEffect(() => {

  const fetchNotifications = async () => {
    if (!user) return;

    try {

      const data = await getNotifications();

      setNotifications(data);

      setUnreadCount(data.filter(n => !n.isRead).length);

    } catch (err) {
      console.error(err);
    }
  };

  fetchNotifications();

}, [user]);
 const handleNotificationClick = async (notification) => {
  try {
    await markNotificationRead(notification._id);

    const updatedNotifications = notifications.map(notif =>
      notif._id === notification._id
        ? { ...notif, isRead: true }
        : notif
    );

    setNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.filter(n => !n.isRead).length);

    if (notification.ticketId) {
      navigate(`/customer/order/`);
    }

  } catch (err) {
    console.error(err);
  }
};
   const notificationContent = (
    <div style={{ width: 320, maxHeight: 400, overflowY: 'auto' }}>
      <List
        itemLayout="horizontal"
        dataSource={notifications}
        locale={{ emptyText: "Không có thông báo nào" }}
        renderItem={item => (
          <List.Item 
            style={{ 
              padding: '12px', 
              cursor: 'pointer',
              backgroundColor: item.isRead ? '#ffffff' : '#f0f5ff', // Highlight màu xanh nhạt nếu chưa đọc
              borderBottom: '1px solid #f0f0f0'
            }}
            onClick={() => handleNotificationClick(item)}
          >
            <List.Item.Meta
              title={
                <Text strong={!item.isRead} style={{ color: '#2D4F36' }}>
                  {item.title}
                </Text>
              }
              description={
                <div>
                  <div style={{ fontSize: '13px', color: '#555' }}>{item.message}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{item.date}</div>
                </div>
              }
            />
          </List.Item>
        )}
      />
      <div style={{ textAlign: "center", marginTop: "8px", borderTop: "1px solid #f0f0f0", paddingTop: "8px", paddingBottom: "4px" }}>
        <Link to="/customer/notifications" style={{ color: "#2D4F36", fontWeight: 600 }} onClick={() => setUnreadCount(prev => prev)}>
          Xem toàn bộ thông báo
        </Link>
      </div>
    </div>
  );
  const handleMenuClick = (key, path) => {
    setActiveMenu(key);
    navigate(path);
  };

  if (loading) return null;
const handleLogout = () => {
  navigate("/login"); 

  dispatch(logoutUserThunk()); 
};

  const handleContactClick = () => {
    if (location.pathname === '/' || location.pathname === '/landing') {
      document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  };

  return (

    <Header className="custom-header-wrapper">
      {/* --- PHẦN 1: TOP BAR (NỀN TRẮNG) --- */}
      <div className="header-top">
        <div className="header-container-fluid">
          <Row
            align="middle"
            justify="space-between"
            style={{ width: '100%', height: "100%" }}
          >
            {/* Logo bên trái */}
            <Col>
              <div
                className="logo"
                onClick={() => {
                  const isGeneral = user?.isGeneral || user?.dispatcherProfile?.isGeneral;
                  let dashboardPath = "/";
                  if (user?.role === "admin") {
                    dashboardPath = "/admin";
                  } else if (user?.role === "dispatcher") {
                    dashboardPath = isGeneral ? "/dispatcher/dashboard" : "/dispatcher/surveys";
                  } else if (user?.role === "customer") {
                    dashboardPath = "/";
                  }

                  navigate(dashboardPath);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{ cursor: "pointer" }}
              >
                <img
                  src="/images/logo.png"
                  alt="HOMS"
                  style={{ height: "60px" }}
                />
              </div>
            </Col>

            {/* Giữa & Phải: Tìm kiếm + Nút Liên Hệ */}
            <Col xs={0} md={16} lg={12}>
              <div className="top-actions" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                {!isDispatcherMode && (
                  <>
                    <Input
                      prefix={<SearchOutlined style={{ color: "#ccc" }} />}
                      placeholder="Tra cứu đơn (VD: INV-2026-00001)..."
                      className="header-search"
                      bordered={false}
                      onPressEnter={(e) => {
                        const code = e.target.value.trim();
                        if (code) {
                          navigate(`/customer/order?searchCode=${code}`);
                        }
                      }}
                    />
                    <Button type="primary" className="contact-btn-top" iconPosition="end" onClick={handleContactClick}>
                      Liên Hệ Ngay <RightOutlined style={{ fontSize: "10px" }} />
                    </Button>
                  </>
                )}

                {!user ? (
                  <>
                    <Link to="/login">
                      <Button type="primary" className="login">
                        Đăng Nhập
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button type="primary" className="signup">
                        Đăng Kí
                      </Button>
                    </Link>
                  </>
                ) : (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Popover 
                      placement="bottomRight" 
                      title="Thông báo của bạn" 
                      content={notificationContent} 
                      trigger="click"
                    >
                      <Badge count={unreadCount} overflowCount={99} size="small">
                        <BellOutlined style={{ fontSize: '20px', cursor: 'pointer', color: '#2D4F36' }} />
                      </Badge>
                    </Popover>
                  <Dropdown
                    placement="bottomRight"
                    menu={{
                      items: [
                        {
                          key: "profile",
                          label: "Trang cá nhân",
                          onClick: () => navigate("/customer/profile")
                        },
                        {
                          key: "contracts",
                          label: "Hợp đồng của tôi",
                          onClick: () => navigate("/customer/contracts") 
                        },
                        {
                          key: "invoices",
                          label: "Hóa đơn của tôi",
                          onClick: () => navigate("/customer/invoices")
                        },
                        {
                          type: "divider",
                        },
                        {
                          key: "logout",
                          label: "Đăng xuất",
                          danger: true,
                          onClick: handleLogout,
                        },
                      ],
                    }}
                  >
                    <Button
                      type="text"
                      className="user-btn"
                    >
                      <Avatar
                        src={user.avatar}
                        size={32}
                        style={{ backgroundColor: "#44624A" }}
                      >
                        {user.fullName?.charAt(0) || user.name?.charAt(0)}
                      </Avatar>

                      <span className="user-name">
                        {user.fullName || user.name}
                      </span>
                    </Button>
                  </Dropdown>
</div>
                )}

              </div>
            </Col>

            {/* Mobile Menu Button (Hiện khi màn hình nhỏ) */}
            {!isDispatcherMode && (
              <Col xs={4} md={0} style={{ textAlign: "right" }}>
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileMenuVisible(true)}
                  style={{ color: "#2D4F36" }}
                />
              </Col>
            )}
          </Row>
        </div>
      </div>

      {/* --- PHẦN 2: BOTTOM BAR (NỀN XANH #44624A) --- */}
      {!isDispatcherMode && (
        <div className="header-bottom">
          <div className="container">
            <ul className="bottom-nav">
              {navItems.map((item) => (
                <li
                  key={item.key}
                  className={`nav-item ${activeMenu === item.key ? "active" : ""}`}
                  onClick={() => handleMenuClick(item.key, item.path)}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* Mobile Drawer giữ nguyên logic cũ */}
      {!isDispatcherMode && (
        <Drawer
          title={<div style={{ color: '#2D4F36', fontWeight: 700 }}>HOMS Menu</div>}
          placement="right"
          onClose={() => setMobileMenuVisible(false)}
          open={mobileMenuVisible}
          width={280}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div>
              <Menu
                mode="vertical"
                selectedKeys={[activeMenu]}
                items={navItems.map((item) => ({ key: item.key, label: item.label }))}
                onClick={(e) => {
                  const selectedItem = navItems.find((item) => item.key === e.key);
                  if (selectedItem) {
                    handleMenuClick(e.key, selectedItem.path);
                  }
                  setMobileMenuVisible(false);
                }}
                style={{ border: "none" }}
              />
            </div>
            
            <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
              {!user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Link to="/login" onClick={() => setMobileMenuVisible(false)}>
                    <Button type="default" block size="large" style={{ borderRadius: '8px' }}>
                      Đăng Nhập
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuVisible(false)}>
                    <Button type="primary" block size="large" style={{ borderRadius: '8px', background: '#2D4F36' }}>
                      Đăng Kí
                    </Button>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => { navigate("/customer/profile"); setMobileMenuVisible(false); }}>
                    <Avatar src={user.avatar} size={40}>{user.fullName?.charAt(0)}</Avatar>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{user.fullName || user.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>Xem hồ sơ</div>
                    </div>
                  </div>
                  <Button danger type="primary" block onClick={handleLogout} style={{ borderRadius: '8px' }}>
                    Đăng Xuất
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Drawer>
      )}
    </Header>
  );
};

export default AppHeader;
