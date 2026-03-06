import React, { useState, useEffect } from "react";
import { Layout, Row, Col, Button, Input, Drawer, Menu } from "antd";
import { MenuOutlined, SearchOutlined, RightOutlined } from "@ant-design/icons";
import "./header.css";
import { Link, useLocation } from "react-router-dom";
import useUser from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";

import { Avatar, Dropdown } from "antd";
const { Header } = Layout;

const AppHeader = () => {

  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [activeMenu, setActiveMenu] = useState("dashboard"); // State để track menu đang active
  const { user, logout, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

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
    }
  }, [location.pathname]);

  const handleMenuClick = (key, path) => {
    setActiveMenu(key);
    navigate(path);
  };

  if (loading) return null;

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
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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
              <div className="top-actions">
                <Input
                  prefix={<SearchOutlined style={{ color: "#ccc" }} />}
                  placeholder="Chuyển nhà, báo giá..."
                  className="header-search"
                  bordered={false}
                />
                <Button
                  type="primary"
                  className="contact-btn-top"
                  iconPosition="end"
                >
                  Liên Hệ Ngay <RightOutlined style={{ fontSize: "10px" }} />
                </Button>
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
                  <Dropdown
                    placement="bottomRight"
                    menu={{
                      items: [
                        {
                          key: "profile",
                          label: "Trang cá nhân",
                          onClick: () => navigate("/profile")
                        },
                        {
                          type: "divider",
                        },
                        {
                          key: "logout",
                          label: "Đăng xuất",
                          danger: true,
                          onClick: logout,
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

                )}

              </div>
            </Col>

            {/* Mobile Menu Button (Hiện khi màn hình nhỏ) */}
            <Col xs={4} md={0} style={{ textAlign: "right" }}>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuVisible(true)}
                style={{ color: "#2D4F36" }}
              />
            </Col>
          </Row>
        </div>
      </div>

      {/* --- PHẦN 2: BOTTOM BAR (NỀN XANH #44624A) --- */}
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

      {/* Mobile Drawer giữ nguyên logic cũ */}
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        width={250}
      >
        <Menu
          mode="vertical"
          selectedKeys={[activeMenu]}
          items={navItems.map((item) => ({ key: item.key, label: item.label }))}
          onClick={(e) => {
            const selectedItem = navItems.find(item => item.key === e.key);
            if (selectedItem) {
              handleMenuClick(e.key, selectedItem.path);
            }
            setMobileMenuVisible(false);
          }}
          style={{ border: "none" }}
        />
      </Drawer>
    </Header>
  );
};

export default AppHeader;
