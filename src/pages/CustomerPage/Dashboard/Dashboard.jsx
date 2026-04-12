import React, { useState, useEffect } from "react";
import { Row, Col, message, Modal, Form, Input, Select, Button, Space, Tag, Tooltip, Empty, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Clock, MapPin, Truck, CalendarCheck, Package, PhoneCall, RefreshCcw, Mail
} from 'lucide-react';
import {
    EnvironmentOutlined, AppstoreOutlined, ArrowRightOutlined, InboxOutlined,
    ToolOutlined, SafetyOutlined, ClockCircleOutlined, CarOutlined, TeamOutlined,
    WarningOutlined, DollarOutlined, GiftOutlined, PercentageOutlined, InfoCircleOutlined,
    EyeOutlined, FileTextOutlined, HomeOutlined
} from '@ant-design/icons';

import api from '../../../services/api';
import AppHeader from "../../../components/header/header";
import AppFooter from "../../../components/footer/footer";
import useUser from "../../../contexts/UserContext";
import "./Dashboard.css";

const { Option } = Select;

const InfoRow = ({ icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <span style={{ color: '#44624a', fontSize: 13, flexShrink: 0 }}>{icon}</span>
        <span style={{ color: '#6b7280', flexShrink: 0, fontWeight: 500 }}>{label}:</span>
        <span style={{ fontWeight: 600, color: '#111827' }}>{value}</span>
    </div>
);

// Beautiful Detail Modal Component - Focuses primarily on Pricing Breakdown since other details are now on dashboard
const SurveyDetailModal = ({ visible, onClose, activeTicket, surveyData, invoiceData, pricingData }) => {
    const pricing = pricingData?.breakdown ? pricingData : invoiceData?.pricing || {};
    const bd = pricing?.breakdown || {};

    if (!surveyData || (!invoiceData && !pricingData)) {
        return (
            <Modal
                title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <EyeOutlined style={{ color: '#44624a', fontSize: 18 }} />
                    <span>Chi tiết đơn hàng</span>
                </div>}
                open={visible}
                onCancel={onClose}
                width={880}
                footer={<Button onClick={onClose}>Đóng</Button>}
            >
                <Empty description="Chưa có thông tin khảo sát và báo giá" />
            </Modal>
        );
    }

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <EyeOutlined style={{ color: '#44624a', fontSize: 18 }} />
                    <span style={{ fontSize: 16 }}>
                        Báo giá chi tiết —{' '}
                        <strong style={{ color: '#44624a' }}>
                            #{activeTicket?.code?.slice(-10).toUpperCase()}
                        </strong>
                    </span>
                </div>
            }
            open={visible}
            onCancel={onClose}
            width={700}
            styles={{ body: { padding: '24px', maxHeight: '80vh', overflowY: 'auto' } }}
            footer={[
                <Button key="close" type="primary" style={{ background: '#44624a' }} onClick={onClose}>Đóng</Button>
            ]}
        >
            <div style={{ fontSize: 14 }}>
                {/* ── SECTION 3: PRICING BREAKDOWN ── */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ background: '#ecfdf5', color: '#44624a', borderRadius: 8, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <DollarOutlined style={{ fontSize: 15 }} />
                            <span style={{ fontWeight: 700, fontSize: 14 }}>Cấu thành giá chi tiết</span>
                        </div>
                    </div>

                    {(() => {
                        const lines = [
                            { icon: <ArrowRightOutlined />, label: 'Phí vận chuyển cơ bản', value: bd.baseTransportFee, always: false },
                            { icon: <CarOutlined />, label: 'Phí xe tải (theo km)', value: bd.vehicleFee, always: false },
                            { icon: <TeamOutlined />, label: 'Phí nhân công', value: bd.laborFee, always: false },
                            { icon: <AppstoreOutlined />, label: 'Phí dịch vụ đồ vật', value: bd.itemServiceFee, always: false },
                            { icon: <EnvironmentOutlined />, label: 'Phụ phí chặng xa (>30km)', value: bd.distanceFee, always: false },
                            { icon: <TeamOutlined />, label: 'Phí khiêng vác bộ', value: bd.carryFee, always: false },
                            { icon: <AppstoreOutlined />, label: 'Phí tầng lầu', value: bd.floorFee, always: false },
                            { icon: <ToolOutlined />, label: 'Phí tháo lắp', value: bd.assemblingFee, always: false },
                            { icon: <InboxOutlined />, label: 'Phí đóng gói', value: bd.packingFee, always: false },
                            { icon: <SafetyOutlined />, label: 'Phí bảo hiểm', value: bd.insuranceFee, always: false },
                            { icon: <InfoCircleOutlined />, label: 'Phí quản lý', value: bd.managementFee, always: false },
                        ].filter(l => l.always || (l.value != null && l.value > 0));

                        return (
                            <>
                                {lines.map((l, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#4b5563', fontSize: 14, fontWeight: 500 }}>
                                            <span style={{ color: '#44624a', fontSize: 14 }}>{l.icon}</span>
                                            {l.label}
                                        </span>
                                        <strong style={{ color: '#111827', fontSize: 14 }}>{(l.value || 0).toLocaleString()} ₫</strong>
                                    </div>
                                ))}

                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 8px', marginTop: 8 }}>
                                    <span style={{ fontWeight: 600, color: '#374151', fontSize: 15 }}>Tạm tính</span>
                                    <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{(pricing.subtotal || 0).toLocaleString()} ₫</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 16px', color: '#6b7280' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><PercentageOutlined /> Thuế VAT</span>
                                    <span style={{ fontWeight: 500 }}>{(pricing.tax || 0).toLocaleString()} ₫</span>
                                </div>

                                <div style={{ borderBottom: '2px dashed #d1d5db', margin: '8px 0 16px' }} />

                                {pricing.minimumChargeApplied && (
                                    <Tag icon={<WarningOutlined />} color="orange" style={{ margin: '0 0 16px', width: '100%', textAlign: 'center', borderRadius: 8, padding: '6px' }}>
                                        Áp dụng phí tối thiểu
                                    </Tag>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'linear-gradient(135deg, #44624a, #8ba888)', borderRadius: 12, color: 'white', boxShadow: '0 10px 25px rgba(5, 150, 105, 0.2)' }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><DollarOutlined /> TỔNG CỘNG</span>
                                    <span style={{ fontSize: 26, fontWeight: 800 }}>{(pricing.totalPrice || 0).toLocaleString()} ₫</span>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        </Modal>
    );
};

const getMoveTypeConfig = (type) => {
    const map = {
        'FULL_HOUSE': { label: 'Chuyển Nhà', color: 'geekblue' },
        'SPECIFIC_ITEMS': { label: 'Chuyển Đồ', color: 'cyan' },
        'TRUCK_RENTAL': { label: 'Thuê Xe', color: 'purple' },
        'OFFICE_MOVING': { label: 'Chuyển Văn Phòng', color: 'orange' }
    };
    return map[type] || { label: type || 'Khác', color: 'default' };
};

const translateTruckType = (code) => {
    const map = {
        'TRUCK_500KG': 'Xe 500 Kg',
        'TRUCK_1000KG': 'Xe 1 Tấn',
        'TRUCK_1500KG': 'Xe 1.5 Tấn',
        'TRUCK_2000KG': 'Xe 2 Tấn',
        'TRUCK_2500KG': 'Xe 2.5 Tấn',
        'TRUCK_5000KG': 'Xe 5 Tấn',
        '500KG': '500 Kg',
        '1TON': '1 Tấn',
        '1.5TON': '1.5 Tấn',
        '2TON': '2 Tấn',
        '2.5TON': '2.5 Tấn',
        '5TON': '5 Tấn'
    };
    return map[code] || code;
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useUser();

    const [activeTicket, setActiveTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [surveyData, setSurveyData] = useState(null);
    const [invoiceData, setInvoiceData] = useState(null);
    const [pricingData, setPricingData] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        const fetchTickets = async () => {
            if (!isAuthenticated || !user) return;
            try {
                const response = await api.get(`/request-tickets`, {
                    params: { customerId: user._id || user.id }
                });

                if (response.data && response.data.success) {
                    let userTickets = response.data.data || [];
                    const currentUserId = user._id || user.id;

                    userTickets = userTickets.filter(t =>
                        (t.customerId && t.customerId._id === currentUserId) ||
                        t.customerId === currentUserId
                    );

                    if (userTickets.length > 0) {
                        userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        const active = userTickets[0];
                        setActiveTicket(active);

                        try {
                            const surveyRes = await api.get(`/surveys/ticket/${active._id}`);
                            if (surveyRes.data?.data) {
                                setSurveyData(surveyRes.data.data);
                            } else if (surveyRes.data) {
                                setSurveyData(surveyRes.data);
                            }
                        } catch (err) { }

                        try {
                            const pricingRes = await api.get(`/pricing/${active._id}`);
                            if (pricingRes.data?.data) {
                                setPricingData(pricingRes.data.data);
                            }
                        } catch (err) { }

                        try {
                            const ticketInvoiceRes = await api.get(`/invoices/ticket/${active._id}`);
                            const invId = ticketInvoiceRes.data?.data?._id;
                            if (invId) {
                                const fullInvoiceRes = await api.get(`/invoices/${invId}`);
                                if (fullInvoiceRes.data?.data) {
                                    setInvoiceData(fullInvoiceRes.data.data);
                                }
                            }
                        } catch (err) { }
                    } else {
                        setActiveTicket(null);
                        setSurveyData(null);
                        setInvoiceData(null);
                        setPricingData(null);
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

    const handleUpdateActiveTicket = () => {
        if (!activeTicket) return;
        message.info("Tính năng cập nhật thông tin đang được bảo trì!");
    };

    const handleCancelActiveTicket = () => {
        if (!activeTicket) return;
        Modal.confirm({
            title: 'Xác nhận hủy yêu cầu',
            content: `Bạn có chắc muốn hủy yêu cầu chuyển nhà ${activeTicket.code || ''}?`,
            okText: 'Đồng ý hủy',
            okType: 'danger',
            cancelText: 'Quay lại',
            async onOk() {
                try {
                    await api.put(`/request-tickets/${activeTicket._id}/cancel`, { reason: 'Customer cancelled from dashboard' });
                    message.success("Đã gửi yêu cầu hủy thành công!");
                    setActiveTicket({ ...activeTicket, status: 'CANCELLED' });
                } catch (error) {
                    message.error("Có lỗi xảy ra khi hủy yêu cầu.");
                }
            }
        });
    };

    const handleQuickAction = (route) => navigate(route);

    const formatDate = (dateString) => {
        if (!dateString) return "Chưa có lịch";
        const date = new Date(dateString);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    };

    const getStatusText = (status) => {
        const map = {
            'CREATED': 'Chờ xác nhận',
            'WAITING_SURVEY': 'Chờ khảo sát',
            'SURVEYED': 'Đã khảo sát',
            'QUOTED': 'Đã báo giá',
            'ACCEPTED': 'Đã chấp nhận',
            'CONVERTED': 'Đã tạo HĐ',
            'IN_PROGRESS': 'Đang vận chuyển',
            'COMPLETED': 'Hoàn thành',
            'CANCELLED': 'Đã hủy'
        };
        return map[status] || 'Đang xử lý';
    };

    const getProgressFromStatus = (status) => {
        const order = ['CREATED', 'WAITING_SURVEY', 'SURVEYED', 'QUOTED', 'ACCEPTED', 'CONVERTED', 'IN_PROGRESS', 'COMPLETED'];
        if (status === 'CANCELLED') return 0;
        const index = order.indexOf(status);
        if (index === -1) return 10;
        return Math.floor(((index + 1) / order.length) * 100);
    };

    return (
        <div className="dashboard-page-container">
            <AppHeader />

            {/* HERO BANNER */}
            <section className="dash-hero-section">
                <div className="dash-hero-content">
                    <h1 className="dash-hero-title">Bảng Điều Khiển</h1>
                    <p className="dash-hero-subtitle">Quản lý lộ trình và tiến độ dịch vụ chuyển nhà của bạn</p>
                </div>
            </section>

            <div className="dash-main-body">

                {/* SECTION 1: Thao Tác Nhanh */}
                <h2 className="dash-section-title"><ClockCircleOutlined /> Thao Tác Nhanh</h2>
                <div className="dash-content-block">
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={12}>
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="premium-card">
                                {activeTicket ? (
                                    <>
                                        <div className="premium-card-header">
                                            <div className="premium-card-title">
                                                <FileTextOutlined style={{ color: '#44624a' }} />
                                                Trạng thái Đơn hàng #{activeTicket?.code?.slice(-10).toUpperCase() || 'MỚI'}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                {activeTicket.moveType && (
                                                    <Tag color={getMoveTypeConfig(activeTicket.moveType).color} style={{ margin: 0, borderRadius: 12, padding: '2px 10px', fontSize: 13, fontWeight: 600 }}>
                                                        {getMoveTypeConfig(activeTicket.moveType).label}
                                                    </Tag>
                                                )}
                                                <span className="dash-status-badge">{getStatusText(activeTicket.status)}</span>
                                            </div>
                                        </div>

                                        <div className="dash-route-timeline">
                                            {activeTicket.moveType !== 'TRUCK_RENTAL' && <div className="dash-route-connector" />}
                                            <div className="dash-route-point">
                                                <div className="dash-route-icon pickup"><HomeOutlined /></div>
                                                <div className="dash-route-info">
                                                    <div className="dash-route-label">{activeTicket.moveType === 'TRUCK_RENTAL' ? 'Địa điểm nhận xe / Nơi tài xế đón' : 'Từ (Nơi đi)'}</div>
                                                    <div className="dash-route-address">{activeTicket.pickup?.address || "Chưa cập nhật điểm lấy"}</div>
                                                </div>
                                            </div>
                                            {activeTicket.moveType !== 'TRUCK_RENTAL' && (
                                                <div className="dash-route-point">
                                                    <div className="dash-route-icon delivery"><EnvironmentOutlined /></div>
                                                    <div className="dash-route-info">
                                                        <div className="dash-route-label">Đến (Nơi đến)</div>
                                                        <div className="dash-route-address">{activeTicket.delivery?.address || "Chưa cập nhật điểm đến"}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="dash-progress-wrapper">
                                            <div className="dash-progress-label">
                                                <span>Tiến trình thực hiện</span>
                                                <span>{getProgressFromStatus(activeTicket.status)}%</span>
                                            </div>
                                            <div className="dash-progress-bar">
                                                <div className="dash-progress-fill" style={{ width: `${getProgressFromStatus(activeTicket.status)}%` }} />
                                            </div>
                                        </div>

                                        <div className="order-action-buttons">
                                            <button className="btn-action btn-action-update" onClick={handleUpdateActiveTicket} disabled={activeTicket.status === 'CANCELLED' || activeTicket.status === 'COMPLETED'}>
                                                Cập nhật TT
                                            </button>
                                            <button className="btn-action btn-action-cancel" onClick={handleCancelActiveTicket} disabled={activeTicket.status === 'CANCELLED' || activeTicket.status === 'COMPLETED'}>
                                                Hủy yêu cầu
                                            </button>
                                            <button
                                                className="btn-action btn-action-primary"
                                                onClick={() => setShowDetailModal(true)}
                                                disabled={!surveyData || (!invoiceData && !pricingData) || ['CREATED', 'WAITING_SURVEY', 'CANCELLED'].includes(activeTicket.status)}
                                            >
                                                <EyeOutlined /> Xem Báo Giá Chi Tiết
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                                        <InboxOutlined style={{ fontSize: 48, color: '#9ca3af' }} />
                                        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#4b5563', margin: 0 }}>Chưa có yêu cầu nào</h3>
                                        <p style={{ color: '#6b7280', margin: 0 }}>Bạn chưa có yêu cầu chuyển nhà nào đang xử lý.</p>
                                    </div>
                                )}
                            </motion.div>
                        </Col>

                        <Col xs={24} lg={12}>
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} style={{ height: '100%' }}>
                                <div className="qa-grid">
                                    <div className="qa-card" onClick={() => handleQuickAction('/customer/service-packages')}>
                                        <div className="qa-icon"><CalendarCheck size={28} /></div>
                                        <div className="qa-title">Đặt Lịch & Khảo Sát</div>
                                    </div>
                                    <div className="qa-card" onClick={() => handleQuickAction('/customer/pricing-plans')}>
                                        <div className="qa-icon"><DollarOutlined style={{ fontSize: 28 }} /></div>
                                        <div className="qa-title">Xem Bảng Giá</div>
                                    </div>
                                    <div className="qa-card" onClick={() => {
                                        if (activeTicket) {
                                            handleQuickAction(`/customer/video-chat?room=${activeTicket.code}`);
                                        } else {
                                            message.info("Bạn chưa có đơn hàng nào để liên hệ hỗ trợ!");
                                        }
                                    }}>
                                        <div className="qa-icon"><PhoneCall size={28} /></div>
                                        <div className="qa-title">Liên Hệ Hỗ Trợ</div>
                                    </div>
                                    <div className="qa-card" onClick={() => handleQuickAction('/customer/order')}>
                                        <div className="qa-icon"><RefreshCcw size={28} /></div>
                                        <div className="qa-title">Lịch Sử Đơn Hàng</div>
                                    </div>
                                </div>
                            </motion.div>
                        </Col>
                    </Row>
                </div>

                {/* SECTION 2: Tổng Quan Đồ Đạc */}
                {activeTicket && !['CREATED', 'WAITING_SURVEY', 'CANCELLED'].includes(activeTicket.status) && surveyData && activeTicket.moveType !== 'TRUCK_RENTAL' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <h2 className="dash-section-title" style={{ marginTop: 60 }}><InboxOutlined /> Tổng Quan Đồ Đạc Khảo Sát</h2>
                        <div className="premium-card" style={{ marginBottom: 40 }}>
                            <div className="metrics-grid">
                                <div className="metric-card accent">
                                    <div className="metric-icon"><EnvironmentOutlined /></div>
                                    <div className="metric-content">
                                        <div className="metric-label">Quãng đường</div>
                                        <div className="metric-value">{surveyData.distanceKm} km</div>
                                    </div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-icon"><AppstoreOutlined /></div>
                                    <div className="metric-content">
                                        <div className="metric-label">Tầng lầu & Vận chuyển</div>
                                        <div className="metric-value" style={{ fontSize: 13, lineHeight: '22px' }}>
                                            <div>Tầng lầu: {surveyData.floors > 0 ? `${surveyData.floors} tầng` : 'Trệt'}</div>
                                            <div>Thang máy: {surveyData.hasElevator ? 'Có' : 'Không'}</div>
                                            <div>Khênh bộ: {surveyData.carryMeter > 0 ? `${surveyData.carryMeter} m` : '0 m'}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-icon"><ToolOutlined /></div>
                                    <div className="metric-content">
                                        <div className="metric-label">Dịch Vụ Kèm Theo</div>
                                        <div className="metric-value" style={{ fontSize: 13, lineHeight: '22px', marginTop: 4 }}>
                                            {(!surveyData.needsPacking && !surveyData.needsAssembling) ? (
                                                <div>Không yêu cầu</div>
                                            ) : (
                                                <>
                                                    {surveyData.needsPacking && <div>• Dịch vụ Đóng gói</div>}
                                                    {surveyData.needsAssembling && <div>• Dịch vụ Tháo lắp</div>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {surveyData.notes && (
                                <div style={{ background: '#fefce8', borderRadius: 12, padding: '12px 16px', border: '1px solid #fef08a', color: '#854d0e', fontSize: 14, marginTop: 16 }}>
                                    <FileTextOutlined style={{ marginRight: 8 }} />
                                    <em>Ghi chú khảo sát: {surveyData.notes}</em>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* SECTION 3: Nguồn lực & Nhân sự */}
                {activeTicket && !['CREATED', 'WAITING_SURVEY', 'CANCELLED'].includes(activeTicket.status) && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: activeTicket.moveType === 'TRUCK_RENTAL' ? 0.2 : 0.3 }}>
                        <h2 className="dash-section-title" style={{ marginTop: activeTicket.moveType === 'TRUCK_RENTAL' ? 60 : 0 }}>
                            <TeamOutlined /> {activeTicket.moveType === 'TRUCK_RENTAL' ? 'Chi Tiết Thuê Xe' : 'Nguồn Lực & Nhân Sự Điều Phối'}
                        </h2>
                        <div className="premium-card">
                            {invoiceData?.dispatchAssignmentId?.assignments?.length > 0 ? (
                                <div className="resource-list">
                                    {invoiceData.dispatchAssignmentId.assignments.map((assignment, index) => (
                                        <div key={index} className="resource-card">
                                            <div className="resource-avatar truck"><Truck /></div>
                                            <div className="resource-details">
                                                <h4>Xe tải: {assignment.vehicleId?.plateNumber || assignment.vehicleId?.licensePlate || 'Chưa cập nhật'}</h4>
                                                <p>{assignment.vehicleId?.vehicleType && `${translateTruckType(assignment.vehicleId.vehicleType)} • `}{assignment.vehicleId?.loadCapacity && `${assignment.vehicleId.loadCapacity} tấn`}</p>
                                            </div>
                                            <div style={{ width: 1, height: 40, background: '#e5e7eb', margin: '0 16px' }} />
                                            <div className="resource-avatar"><TeamOutlined /></div>
                                            <div className="resource-details flex-1">
                                                <h4>Phụ trách đội: {assignment.driverIds?.map(d => d?.fullName || d?.username).join(', ') || 'Chưa phân công'}</h4>
                                                <p>Hỗ trợ: {assignment.staffIds?.length || 0} nhân sự {assignment.staffIds?.length > 0 && `(${assignment.staffIds.map(s => s?.fullName || s?.username).join(', ')})`}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : surveyData ? (
                                <div className="metrics-grid" style={{ marginBottom: activeTicket.moveType === 'TRUCK_RENTAL' ? 0 : 24 }}>
                                    <div className="metric-card accent">
                                        <div className="metric-icon"><CarOutlined /></div>
                                        <div className="metric-content">
                                            <div className="metric-label">Phương tiện</div>
                                            <div className="metric-value">{translateTruckType(surveyData.suggestedVehicle) || 'Đang tính toán'}</div>
                                        </div>
                                    </div>
                                    {activeTicket.moveType !== 'TRUCK_RENTAL' && (
                                        <div className="metric-card accent">
                                            <div className="metric-icon"><TeamOutlined /></div>
                                            <div className="metric-content">
                                                <div className="metric-label">Nhân sự</div>
                                                <div className="metric-value">{surveyData.suggestedStaffCount ? `${surveyData.suggestedStaffCount} người` : 'Đang tính toán'}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="metric-card accent">
                                        <div className="metric-icon"><ClockCircleOutlined /></div>
                                        <div className="metric-content">
                                            <div className="metric-label">Thời gian</div>
                                            <div className="metric-value">{surveyData.estimatedHours ? `${surveyData.estimatedHours} giờ` : 'Đang tính toán'}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                    <TeamOutlined style={{ fontSize: 40, color: '#d1d5db', marginBottom: 16 }} />
                                    <p style={{ margin: 0 }}>Đang chờ hệ thống phân công nhân sự và xe tải chở hàng.</p>
                                </div>
                            )}

                            {activeTicket.moveType !== 'TRUCK_RENTAL' && surveyData?.items?.length > 0 && (
                                <div className="items-wrapper" style={{ marginTop: invoiceData?.dispatchAssignmentId?.assignments?.length > 0 ? 24 : 0 }}>
                                    <div className="items-header">
                                        <InboxOutlined style={{ color: '#44624a' }} /> Đồ đạc cần chuyển ({surveyData.items.length} món)
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                        {surveyData.items.map((item, idx) => {
                                            const isCritical = item.name?.startsWith('⚠️') || item.name?.startsWith('[CRIT');
                                            const isSec = item.name?.startsWith('[SEC:');
                                            const displayName = isSec ? item.name.replace(/^[SEC:[^]]+]s*/, '') : item.name?.replace('⚠️ ', '') || item.name;
                                            const conditionTooltip = { GOOD: 'Tình trạng tốt', FRAGILE: 'Dễ vỡ — cần bảo quản kỹ', DAMAGED: 'Đã hư hỏng' }[item.condition];
                                            return (
                                                <Tooltip key={idx} title={conditionTooltip || ''}>
                                                    <Tag
                                                        icon={isCritical ? <WarningOutlined /> : null}
                                                        color={isCritical ? '#fef2f2' : isSec ? '#fff7ed' : '#c0cfb2'}
                                                        style={{ color: isCritical ? '#dc2626' : isSec ? '#ea580c' : '#44624a', borderColor: isCritical ? '#fca5a5' : isSec ? '#fdba74' : '#8ba888', fontSize: 13, padding: '4px 12px', borderRadius: 20 }}
                                                    >
                                                        {displayName}
                                                        {item.actualWeight > 0 && <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 6 }}>{item.actualWeight}kg</span>}
                                                    </Tag>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

            </div>

            {/* GET IN TOUCH SECTION */}
            <section className="dash-contact-section">
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
                    <div className="dash-contact-wrapper">
                        <div className="dash-contact-left">
                            <h2 className="contact-heading">Get in <span>Touch</span></h2>
                            <p className="contact-sub">Liên hệ ngay với chúng tôi để nhận báo giá ưu đãi và tư vấn gói dịch vụ vận chuyển phù hợp nhất.</p>

                            <Form layout="vertical" size="large">
                                <Form.Item><Input placeholder="Nhập họ tên của bạn" className="contact-input" /></Form.Item>
                                <Form.Item><Input placeholder="Email" className="contact-input" /></Form.Item>
                                <Form.Item>
                                    <Select placeholder="Chọn dịch vụ mảng chuyển nhà" className="contact-select">
                                        <Option value="full">Chuyển nhà trọn gói</Option>
                                        <Option value="office">Chuyển văn phòng</Option>
                                        <Option value="room">Chuyển phòng trọ</Option>
                                        <Option value="other">Khác</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item>
                                    <Button type="primary" block className="btn-send-contact">Gửi Yêu Cầu</Button>
                                </Form.Item>
                            </Form>

                            <div className="contact-footer-info">
                                <Space size="large" className="contact-space">
                                    <div className="c-info-item">
                                        <PhoneCall size={20} color="#44624a" />
                                        <div>
                                            <div className="c-label">Hotline</div>
                                            <div className="c-value">1900 8888</div>
                                        </div>
                                    </div>
                                    <div className="c-info-item">
                                        <Mail size={20} color="#44624a" />
                                        <div>
                                            <div className="c-label">Email</div>
                                            <div className="c-value">support@homs.vn</div>
                                        </div>
                                    </div>
                                </Space>
                            </div>
                        </div>

                        {/* Map Column */}
                        <div className="dash-contact-right">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3835.6!2d108.2598!3d15.9751!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31420edf9f123abc%3A0xabcdef1234567890!2sFPT%20University%20Da%20Nang!5e0!3m2!1svi!2s!4v1700000000001!5m2!1svi!2s"
                                width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="HOMS Office Map"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <SurveyDetailModal
                visible={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                activeTicket={activeTicket}
                surveyData={surveyData}
                invoiceData={invoiceData}
                pricingData={pricingData}
            />

            <AppFooter />
        </div>
    );
};

export default Dashboard;
