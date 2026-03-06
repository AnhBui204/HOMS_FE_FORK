import React, { useState, useEffect } from "react";
import { Row, Col, message, Modal, Form, Input, Select, Button, Space } from "antd";
import { useNavigate } from "react-router-dom";
import {
    Clock, MapPin, Truck, CalendarCheck, Package, PhoneCall, RefreshCcw,
    Building, Box, Scale, Activity, TriangleAlert,
    Wine, Home, Navigation, Edit, Mail
} from 'lucide-react';
import api from '../../../services/api';

import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import useUser from "../../../contexts/UserContext";
import "./Dashboard.css";

const { Option } = Select;

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useUser();

    const [activeTicket, setActiveTicket] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch data for standard request tickets
    useEffect(() => {
        const fetchTickets = async () => {
            if (!isAuthenticated || !user) return;

            try {
                // Fetch tickets by customer using pre-configured api instance
                const response = await api.get(`/request-tickets`, {
                    params: {
                        customerId: user._id || user.id
                    }
                });

                if (response.data && response.data.success) {
                    let userTickets = response.data.data || [];

                    // The backend listTickets populates customerId as an object { _id, fullName, ... }
                    // Filter just to be safe in case the query param filter wasn't exact
                    const currentUserId = user._id || user.id;

                    userTickets = userTickets.filter(t =>
                        (t.customerId && t.customerId._id === currentUserId) ||
                        t.customerId === currentUserId
                    );

                    if (userTickets.length > 0) {
                        // Sort by newest createdAt descending
                        userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        setActiveTicket(userTickets[0]);
                    } else {
                        setActiveTicket(null);
                    }
                }
            } catch (error) {
                console.error("Could not fetch tickets.", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [user, isAuthenticated]);

    // Handle Functional Buttons
    const handleUpdateActiveTicket = () => {
        if (!activeTicket) return;
        message.info("Tính năng cập nhật thông tin đang được bảo trì!");
        // e.g. navigate(`/customer/update-order/${activeTicket._id}`);
    };

    const handleCancelActiveTicket = () => {
        if (!activeTicket) return;
        Modal.confirm({
            title: 'Xác nhận hủy yêu cầu',
            content: `Bạn có chắc chắn muốn hủy yêu cầu chuyển nhà ${activeTicket.code || ''} không?`,
            okText: 'Đồng ý hủy',
            okType: 'danger',
            cancelText: 'Quay lại',
            async onOk() {
                try {
                    await api.put(`/request-tickets/${activeTicket._id}/cancel`,
                        { reason: 'Customer cancelled from dashboard' }
                    );
                    message.success("Đã gửi yêu cầu hủy thành công!");
                    // Update local status
                    setActiveTicket({ ...activeTicket, status: 'CANCELLED' });
                } catch (error) {
                    message.error("Có lỗi xảy ra khi hủy yêu cầu. Vui lòng thử lại!");
                    console.error("Lỗi khi hủy ticket:", error);
                }
            }
        });
    };

    // Routing for Quick Actions
    const handleQuickAction = (route) => {
        navigate(route);
    };

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return "Chưa có lịch";
        const date = new Date(dateString);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    };

    // Status translation MAP
    const getStatusText = (status) => {
        const map = {
            'CREATED': 'Khởi tạo',
            'WAITING_SURVEY': 'Chờ khảo sát',
            'SURVEYED': 'Đã khảo sát',
            'QUOTED': 'Đã báo giá',
            'ACCEPTED': 'Đã chấp nhận',
            'CONVERTED': 'Đang thực hiện',
            'COMPLETED': 'Hoàn thành',
            'CANCELLED': 'Đã hủy'
        };
        return map[status] || 'Đang xử lý';
    };

    const getProgressFromStatus = (status) => {
        const order = ['CREATED', 'WAITING_SURVEY', 'SURVEYED', 'QUOTED', 'ACCEPTED', 'CONVERTED', 'COMPLETED'];
        if (status === 'CANCELLED') return 0;
        const index = order.indexOf(status);
        if (index === -1) return 10;
        return Math.floor(((index + 1) / order.length) * 100);
    };

    return (
        <div className="dashboard-page-container">
            <AppHeader />

            {/* HERO BANNER SECTION (Matches Landing Page Style) */}
            <section className="dash-hero-section">
                <div className="dash-hero-overlay"></div>
                <div className="dash-hero-content">
                    <h1 className="dash-hero-title">Bảng Điều Khiển</h1>
                </div>
            </section>

            <div className="dash-main-body">

                {/* SECTION 1: Thao Tác Nhanh */}
                <h2 className="dash-section-title">Thao Tác Nhanh</h2>
                <div className="dash-content-block">
                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={12}>
                            <div className="active-order-widget">
                                {activeTicket ? (
                                    <>
                                        <div className="order-info-row">
                                            <Clock size={16} />
                                            <span>{formatDate(activeTicket.createdAt || activeTicket.expectedMovingDate)}</span>
                                        </div>
                                        <div className="order-info-row">
                                            <MapPin size={16} />
                                            <span className="truncate-text">{activeTicket.pickup?.address || activeTicket.pickupAddress?.address || "Chưa cập nhật điểm lấy"}</span>
                                        </div>
                                        <div className="order-info-row">
                                            <Truck size={16} />
                                            <span className="truncate-text">{activeTicket.delivery?.address || activeTicket.deliveryAddress?.address || "Chưa cập nhật điểm đến"}</span>
                                        </div>

                                        <div className="order-info-row status-wrapper">
                                            <span>Trạng thái: </span>
                                            <div className="status-indicator"></div>
                                            <span className="status-text">{getStatusText(activeTicket.status)}</span>
                                        </div>

                                        <div className="order-progress-row">
                                            <span>Tiến trình: </span>
                                            <div className="progress-track">
                                                <div className="progress-fill" style={{ width: `${getProgressFromStatus(activeTicket.status)}%` }}></div>
                                            </div>
                                            <span>{getProgressFromStatus(activeTicket.status)}%</span>
                                        </div>

                                        <div className="order-action-buttons">
                                            <button
                                                className="btn-action-update"
                                                onClick={handleUpdateActiveTicket}
                                                disabled={activeTicket.status === 'CANCELLED' || activeTicket.status === 'COMPLETED'}
                                            >
                                                Cập nhật thông tin
                                            </button>
                                            <button
                                                className="btn-action-cancel"
                                                onClick={handleCancelActiveTicket}
                                                disabled={activeTicket.status === 'CANCELLED' || activeTicket.status === 'COMPLETED'}
                                            >
                                                Yêu cầu hủy
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="no-active-order">
                                        <Package size={40} color="#8BA888" />
                                        <p>Bạn chưa có yêu cầu chuyển nhà nào đang xử lý.</p>
                                    </div>
                                )}
                            </div>
                        </Col>

                        <Col xs={24} md={12}>
                            <div className="quick-action-grid-buttons">
                                <div className="qa-btn-card" onClick={() => handleQuickAction('/customer/create-order')}>
                                    <CalendarCheck size={28} color="#2D4F36" />
                                    <span>Đặt Lịch Chuyển Nhà</span>
                                </div>
                                <div className="qa-btn-card" onClick={() => handleQuickAction('/pricing-plans')}>
                                    <Package size={28} color="#2D4F36" />
                                    <span>Yêu Cầu Báo Giá</span>
                                </div>
                                <div className="qa-btn-card" onClick={() => handleQuickAction('/pricing-plans')}>
                                    <PhoneCall size={28} color="#2D4F36" />
                                    <span>Liên Hệ Hỗ Trợ</span>
                                </div>
                                <div className="qa-btn-card" onClick={() => handleQuickAction('/pricing-plans')}>
                                    <RefreshCcw size={28} color="#2D4F36" />
                                    <span>Theo Dõi Tiến Trình</span>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* SECTION 2: Tổng Quan Đồ Đạc */}
                <div className="dash-section-header">
                    <h2 className="dash-section-title">Tổng Quan Đồ Đạc</h2>
                    <button className="btn-outline-small" disabled={!activeTicket || ['CREATED', 'WAITING_SURVEY', 'CANCELLED'].includes(activeTicket.status)}>Xem chi tiết &gt;</button>
                </div>

                {!activeTicket || ['CREATED', 'WAITING_SURVEY', 'CANCELLED'].includes(activeTicket.status) ? (
                    <div className="dash-content-block" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: '#666', fontSize: '16px' }}>Đang chờ khảo sát để có danh sách đồ đạc chính xác.</p>
                    </div>
                ) : (
                    <div className="dash-content-block">
                        <Row gutter={[24, 24]} align="stretch">
                            <Col xs={24} md={8}>
                                <div className="overview-stats-card">
                                    <div className="stat-line">
                                        <div className="stat-label"><Building size={16} /> Tổng số phòng</div>
                                        <div className="stat-value">6</div>
                                    </div>
                                    <div className="stat-line">
                                        <div className="stat-label"><Box size={16} /> Tổng số món đồ</div>
                                        <div className="stat-value">63</div>
                                    </div>
                                    <div className="stat-line">
                                        <div className="stat-label"><Scale size={16} /> Ước lượng khối lượng</div>
                                        <div className="stat-value">Nhiều</div>
                                    </div>
                                    <div className="stat-line">
                                        <div className="stat-label"><Activity size={16} /> Độ phức tạp</div>
                                        <div className="stat-value">Cao</div>
                                    </div>

                                    <div className="stat-divider"></div>

                                    <div className="stat-line">
                                        <div className="stat-label"><TriangleAlert size={16} /> Đồ cồng kềnh</div>
                                        <div className="stat-value">Có</div>
                                    </div>
                                    <div className="stat-line">
                                        <div className="stat-label"><Wine size={16} /> Đồ dễ vỡ</div>
                                        <div className="stat-value">Có</div>
                                    </div>

                                    <div className="stat-divider"></div>

                                    <div className="stat-line">
                                        <div className="stat-label"><Home size={16} /> Nhà trong xóm</div>
                                        <div className="stat-value">Có</div>
                                    </div>
                                    <div className="stat-line">
                                        <div className="stat-label"><Navigation size={16} /> Đỗ xe cách nhà (~m)</div>
                                        <div className="stat-value">100</div>
                                    </div>

                                    <div className="stat-divider"></div>

                                    <div className="survey-notes-box">
                                        <div className="survey-notes-title">
                                            <Edit size={16} /> Ghi chú khảo sát
                                        </div>
                                        <ul className="survey-notes-list">
                                            <li>Có piano (~200kg).</li>
                                            <li>Chiều rộng xóm đủ để xe tải vào.</li>
                                            <li>Cầu thang hẹp, góc cua gắt.</li>
                                            <li>Yêu cầu chuyển trước 5 giờ P.M.</li>
                                        </ul>
                                    </div>
                                </div>
                            </Col>
                            <Col xs={24} md={16}>
                                <div className="photo-collage-grid">
                                    <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop" className="p-main" alt="moving loading" />
                                    <img src="https://plus.unsplash.com/premium_photo-1661877737564-3dfd7282efcb?q=80&w=300&auto=format&fit=crop" className="p-top" alt="stack of boxes" />
                                    <img src="https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?q=80&w=300&auto=format&fit=crop" className="p-bottom" alt="movers carrying box" />
                                </div>
                            </Col>
                        </Row>
                    </div>
                )}

                {/* SECTION 3: Nguồn lực & Nhân sự */}
                <h2 className="dash-section-title" style={{ marginTop: '60px' }}>Nguồn lực & Nhân sự</h2>

                {!activeTicket || ['CREATED', 'WAITING_SURVEY', 'CANCELLED'].includes(activeTicket.status) ? (
                    <div className="dash-content-block" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: '#666', fontSize: '16px' }}>Thông tin nhân sự và xe tải sẽ được hiển thị sau khi khảo sát hoàn tất.</p>
                    </div>
                ) : (
                    <div className="dash-content-block">
                        <div className="dash-personnel-row">
                            <div className="personnel-text-col">
                                <h3 className="person-name">Bùi Lê Việt Anh - Tài Xế</h3>
                                <div className="person-sub">Khuân vác: 4 người</div>
                                <div className="person-sub">Loại xe: xe tải thùng 2-tấn</div>
                                <div className="person-divider"></div>
                                <ul className="person-equip-list">
                                    <li>Xe đẩy tay × 2</li>
                                    <li>Tấm chắn bảo vệ × 10</li>
                                    <li>Dây đai nâng × 3</li>
                                    <li>Màng bọc bong bóng × 50 mét</li>
                                </ul>
                            </div>
                            <div className="personnel-gfx-col">
                                <div className="creative-gfx">
                                    <div className="gfx-circle-bg"></div>
                                    <img src="https://plus.unsplash.com/premium_photo-1661882403999-46081e67c401?q=80&w=400&auto=format&fit=crop" className="gfx-img-back" alt="moving truck inside" />
                                    <img src="https://images.unsplash.com/photo-1600486913747-55e5470d6f40?q=80&w=400&auto=format&fit=crop" className="gfx-img-front" alt="driver smiling face" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* GET IN TOUCH SECTION (from LandingPage) */}
            <section className="dash-contact-section">
                <div className="dash-container">
                    <div className="dash-contact-wrapper">
                        <Row gutter={0} style={{ display: 'flex', flexWrap: 'wrap' }}>
                            {/* Form Column */}
                            <Col xs={24} md={12} lg={12} className="dash-contact-left">
                                <div className="contact-form-content">
                                    <h2 className="contact-heading">
                                        Get in <span style={{ color: '#8BA888' }}>Touch</span>
                                    </h2>
                                    <p className="contact-sub">
                                        Liên hệ ngay với chúng tôi để nhận báo giá ưu đãi và tư vấn gói dịch vụ vận chuyển phù hợp nhất.
                                    </p>

                                    <Form layout="vertical" size="large">
                                        <Form.Item>
                                            <Input placeholder="Nhập họ tên của bạn" className="contact-input" />
                                        </Form.Item>
                                        <Form.Item>
                                            <Input placeholder="Email" className="contact-input" />
                                        </Form.Item>

                                        <Form.Item>
                                            <Select placeholder="Chọn dịch vụ mảng chuyển nhà" className="contact-select">
                                                <Option value="full">Chuyển nhà trọn gói</Option>
                                                <Option value="office">Chuyển văn phòng</Option>
                                                <Option value="room">Chuyển phòng trọ</Option>
                                                <Option value="other">Khác</Option>
                                            </Select>
                                        </Form.Item>

                                        <Form.Item>
                                            <Button
                                                type="primary"
                                                block
                                                className="btn-send-contact"
                                            >
                                                Gửi Yêu Cầu
                                            </Button>
                                        </Form.Item>
                                    </Form>

                                    <div className="contact-footer-info">
                                        <Space size="large" className="contact-space">
                                            <div className="c-info-item">
                                                <PhoneCall size={18} color="#2D4F36" />
                                                <div className="c-info-text">
                                                    <span className="c-label">Hotline</span>
                                                    <span className="c-value">1900 8888</span>
                                                </div>
                                            </div>
                                            <div className="c-info-item">
                                                <Mail size={18} color="#2D4F36" />
                                                <div className="c-info-text">
                                                    <span className="c-label">Email</span>
                                                    <span className="c-value">support@homs.vn</span>
                                                </div>
                                            </div>
                                            <div className="c-info-item">
                                                <MapPin size={18} color="#2D4F36" />
                                                <div className="c-info-text">
                                                    <span className="c-label">Văn phòng</span>
                                                    <span className="c-value">FPT Uni, Đà Nẵng</span>
                                                </div>
                                            </div>
                                        </Space>
                                    </div>
                                </div>
                            </Col>

                            {/* Map Column */}
                            <Col xs={24} md={12} lg={12} className="dash-contact-right">
                                <div className="dash-map-container">
                                    <iframe
                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3835.6!2d108.2598!3d15.9751!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31420edf9f123abc%3A0xabcdef1234567890!2sFPT%20University%20Da%20Nang!5e0!3m2!1svi!2s!4v1700000000001!5m2!1svi!2s"
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        allowFullScreen=""
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        title="HOMS Office Map"
                                    ></iframe>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </div>
            </section>

            <AppFooter />
        </div>
    );
};

export default Dashboard;
