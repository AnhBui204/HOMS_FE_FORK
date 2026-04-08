import React, { useState } from 'react';
import { Layout, Button, Avatar, Modal, Form, Input, message, Divider } from 'antd';
import { UserOutlined, PhoneOutlined, HomeOutlined, EditOutlined } from '@ant-design/icons';
import { Navigate, useNavigate } from 'react-router-dom';

import AppHeader from '../../../components/header/header';
import AppFooter from '../../../components/footer/footer';
import useUser from '../../../contexts/UserContext';
import './Profile.css';

const { Content } = Layout;

const ProfilePage = () => {
    const { user, setUser, loading, isAuthenticated } = useUser();
    const [editing, setEditing] = useState(false);
    const [form] = Form.useForm();
    // Avatar upload disabled: keep button but do nothing on click
    const navigate = useNavigate();

    // Nếu chưa load xong, hiển thị loading
    if (loading) {
        return (
            <Layout className="profile-page">
                <AppHeader />
                <Content style={{ textAlign: 'center', padding: '50px' }}>
                    <p>Đang tải...</p>
                </Content>
                <AppFooter />
            </Layout>
        );
    }

    // Nếu chưa đăng nhập, redirect về login
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" />;
    }

    return (
        <Layout className="profile-page">
            <AppHeader />

            <Content>
                {/* HERO */}
                <section className="profile-hero">
                    <h1>Hồ sơ của tôi</h1>
                </section>

                {/* MAIN CONTENT */}
                <section className="profile-container">

                    <Modal
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <EditOutlined style={{ color: '#2D4F36', fontSize: 20, background: '#eaf3ea', borderRadius: 8, padding: 6 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16 }}>Cập nhật thông tin</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>Cập nhật thông tin liên hệ để chúng tôi phục vụ bạn tốt hơn</div>
                                </div>
                            </div>
                        }
                        centered
                        open={editing}
                        onCancel={() => setEditing(false)}
                        footer={null}
                        bodyStyle={{ borderRadius: 8 }}
                    >
                        <Form form={form} layout="vertical" onFinish={async (values) => {
                            try {
                                // call API to update
                                const { updateUserInfo } = await import('../../../services/userService');
                                const fd = new FormData();
                                if (values.fullName) fd.append('fullName', values.fullName);
                                if (values.phone) fd.append('phone', values.phone);
                                if (values.address) fd.append('address', values.address);
                                const res = await updateUserInfo(fd);
                                const updated = res.data?.data || res.data;
                                message.success(res.data?.message || 'Cập nhật thành công');
                                if (updated) setUser(updated);
                                setEditing(false);
                            } catch (err) {
                                console.error(err);
                                message.error(err.response?.data?.message || err.message || 'Cập nhật thất bại');
                            }
                        }}>
                            <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                                <Input prefix={<UserOutlined style={{ color: '#2D4F36' }} />} placeholder="Họ và tên" />
                            </Form.Item>

                            <Form.Item name="phone" label="Số điện thoại">
                                <Input prefix={<PhoneOutlined style={{ color: '#2D4F36' }} />} placeholder="Số điện thoại" />
                            </Form.Item>

                            <Form.Item name="address" label="Địa chỉ">
                                <Input.TextArea rows={2} prefix={<HomeOutlined style={{ color: '#2D4F36' }} />} placeholder="Địa chỉ liên hệ" />
                            </Form.Item>

                            <Divider />

                            <Form.Item style={{ textAlign: 'right' }}>
                                <Button style={{ marginRight: 8 }} onClick={() => setEditing(false)}>Hủy</Button>
                                <Button type="primary" htmlType="submit" style={{ background: '#2D4F36', borderColor: '#2D4F36' }}>Lưu</Button>
                            </Form.Item>
                        </Form>
                    </Modal>

                    {/* CONTACT INFO */}
                    <div className="profile-grid">
                        <div className="profile-card">
                            <h3>Thông tin liên lạc</h3>

                            <div className="profile-row">
                                <span>Email</span>
                                <strong>{user.email || 'N/A'}</strong>
                            </div>

                            <div className="profile-row">
                                <span>Số điện thoại</span>
                                <strong>{user.phone || 'N/A'}</strong>
                            </div>

                            <div className="profile-row">
                                <span>Địa chỉ</span>
                                <strong>
                                    {user.address || '26 Lê Trung Đình, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng'}
                                </strong>
                            </div>

                            <Button className="btn-primary" onClick={() => {
                                form.setFieldsValue({ fullName: user.fullName, phone: user.phone, address: user.address });
                                setEditing(true);
                            }}>
                                Cập nhật thông tin
                            </Button>
                        </div>

                        {/* ACCOUNT INFO */}
                        <div className="profile-card profile-avatar">
                                <Avatar
                                    src={user.avatar}
                                    size={128}
                                    style={{ 
                                        backgroundColor: "#44624A",
                                        fontSize: "48px",
                                        fontWeight: "bold"
                                    }}
                                >
                                    {user.fullName?.charAt(0)}
                                </Avatar>
                            <h4>{user.fullName || 'N/A'}</h4>
                            <p>{user.role || 'Khách hàng'}</p>

                            <Button className="btn-outline" onClick={() => { /* intentionally no-op */ }}>
                                Đổi ảnh đại diện
                            </Button>
                        </div>
                    </div>

                    {/* ACCOUNT DETAILS */}
                    <div className="profile-card full-width">
                        <h3>Thông tin tài khoản</h3>

                        <div className="profile-row">
                            <span>Tên người dùng</span>
                            <strong>{user.fullName || 'N/A'}</strong>
                        </div>

                        <div className="profile-row">
                            <span>Email đăng nhập</span>
                            <strong>{user.email || 'N/A'}</strong>
                        </div>

                        <div className="profile-row">
                            <span>Vai trò</span>
                            <strong>{user.role || 'Khách hàng'}</strong>
                        </div>

                        <div className="profile-row">
                            <span>Ngày tạo tài khoản</span>
                            <strong>
                                {user.createdAt 
                                    ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                                    : 'N/A'
                                }
                            </strong>
                        </div>
                    </div>

                    {/* SECURITY */}
                    <div className="profile-card full-width">
                        <h3>Bảo mật & mật khẩu</h3>

                        <div className="profile-row">
                            <span>Mật khẩu</span>
                            <Button 
                                className="btn-outline"
                                onClick={() => navigate('/change-password')}
                            >
                                Đổi mật khẩu
                            </Button>
                        </div>

                        <div className="profile-row">
                            <span>Trạng thái bảo mật</span>
                            <strong className="status-safe">
                                Đang hoạt động
                            </strong>
                        </div>

                        <div className="profile-row">
                            <span>Phiên đăng nhập</span>
                            <Button danger>
                                Đăng xuất tất cả
                            </Button>
                        </div>
                    </div>

                </section>
            </Content>

            <AppFooter />
        </Layout>
    );
};

export default ProfilePage;